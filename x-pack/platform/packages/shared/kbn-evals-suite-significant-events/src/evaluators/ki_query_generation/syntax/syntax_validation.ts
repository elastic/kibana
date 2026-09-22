/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { ElasticsearchClient, Logger } from '@kbn/core/server';
import type { ESQLAstQueryExpression, ESQLCommand } from '@elastic/esql/types';
import { deriveQueryType } from '@kbn/streams-schema';
import { QUERY_TYPE_STATS } from '@kbn/significant-events-schema';
import type { KIQueryGenerationEvaluator } from '../types';
import { getQueriesFromOutput, getQueryAttempts } from '../types';
import { parseEsqlStrict } from '../parse_esql_strict';

type MatchOutcome = 'matched' | 'empty' | 'unknown';

interface SyntaxDetail {
  esql: string;
  astValid: boolean;
  executionValid: boolean;
  hasHits: boolean;
  matchOutcome: MatchOutcome;
  expectsMatches?: boolean;
  astError?: string;
  executionError?: string;
}

// Ungrouped STATS always returns one row; only STATS with BY has a valid row-count signal.
const statsHasGrouping = (root: ESQLAstQueryExpression): boolean => {
  const statsCmd = root.commands.find(
    (cmd): cmd is ESQLCommand => 'name' in cmd && cmd.name === 'stats'
  );
  if (!statsCmd) {
    return false;
  }
  return statsCmd.args.some(
    (arg) =>
      !Array.isArray(arg) &&
      'type' in arg &&
      arg.type === 'option' &&
      'name' in arg &&
      arg.name === 'by'
  );
};

/**
 * Two-tier ES|QL validation: strict AST parse + ES execution. Hit rate is
 * scored by declared `expects_matches` intent; ungrouped STATS is `unknown`.
 */
export const createSyntaxValidationEvaluator = (
  esClient: ElasticsearchClient,
  logger?: Logger
): KIQueryGenerationEvaluator => ({
  name: 'syntax_validation',
  kind: 'CODE' as const,
  direction: 'maximize',
  evaluate: async ({ output }) => {
    const queries = getQueriesFromOutput(output);
    if (queries.length === 0) {
      // Abstain rather than score 0: a run that generated nothing has no syntax to be right or
      // wrong about, and scoring it drags the quality mean by however often generation flaked.
      // `generation_success` owns that failure; every sibling evaluator abstains here too.
      return { score: null, explanation: 'No queries generated' };
    }

    let astValidCount = 0;
    let executionValidCount = 0;
    let matchedCount = 0;
    let emptyCount = 0;
    let unknownCount = 0;
    let declaredProactiveCount = 0;
    let proactiveMatchedCount = 0;
    let acceptedWithoutIntentCount = 0;
    let hitRateDenominator = 0;
    const hitRateNumerator: number[] = [];
    const details: SyntaxDetail[] = [];

    for (const query of queries) {
      const detail: SyntaxDetail = {
        esql: query.esql,
        astValid: false,
        executionValid: false,
        hasHits: false,
        matchOutcome: 'unknown',
        expectsMatches: query.expects_matches,
      };

      // Ignore recovery ASTs: a strict-parse failure leaves outcome `unknown`.
      const strictParse = parseEsqlStrict(query.esql);
      if (strictParse.parsed) {
        detail.astValid = true;
        astValidCount++;
      } else {
        detail.astError = strictParse.errors.join('; ');
      }

      let executionOutcome: MatchOutcome = 'unknown';
      try {
        const result = await esClient.esql.query({ query: query.esql });
        detail.executionValid = true;
        executionValidCount++;
        if (result.values && result.values.length > 0) {
          detail.hasHits = true;
        }
        if (strictParse.parsed) {
          const queryType = deriveQueryType(query.esql);
          if (queryType === QUERY_TYPE_STATS && !statsHasGrouping(strictParse.root)) {
            executionOutcome = 'unknown';
          } else {
            executionOutcome = detail.hasHits ? 'matched' : 'empty';
          }
        }
      } catch (e) {
        const errorMessage = e instanceof Error ? e.message : String(e);
        detail.executionError = errorMessage;
        logger?.warn(`ES|QL execution failed for "${query.esql}": ${errorMessage}`);
      }
      detail.matchOutcome = executionOutcome;

      if (executionOutcome === 'matched') matchedCount++;
      else if (executionOutcome === 'empty') emptyCount++;
      else unknownCount++;

      const expectsMatches = query.expects_matches;
      if (expectsMatches === true) {
        if (executionOutcome === 'matched' || executionOutcome === 'empty') {
          hitRateDenominator++;
          hitRateNumerator.push(executionOutcome === 'matched' ? 1 : 0);
        }
      } else if (expectsMatches === false) {
        declaredProactiveCount++;
        if (executionOutcome === 'matched') {
          proactiveMatchedCount++;
        }
      } else {
        // Unreachable while the eval runs with `requireQueryIntent`, which rejects intent-less
        // queries before they are accepted. Kept as an invariant: non-zero means that broke.
        acceptedWithoutIntentCount++;
      }

      details.push(detail);
    }

    const astSyntaxValidityRate = astValidCount / queries.length;
    const executionSuccessRate = executionValidCount / queries.length;
    const executionHitRate =
      hitRateDenominator > 0
        ? hitRateNumerator.reduce((a, b) => a + b, 0) / hitRateDenominator
        : null;
    const includesHitRate = hitRateDenominator > 0;

    const scoreComponents = [astSyntaxValidityRate, executionSuccessRate];
    if (executionHitRate !== null) {
      scoreComponents.push(executionHitRate);
    }
    const score =
      scoreComponents.reduce((sum, scoreComponent) => sum + scoreComponent, 0) /
      scoreComponents.length;

    const issues: string[] = [];
    if (astValidCount < queries.length) {
      issues.push(
        `${queries.length - astValidCount}/${queries.length} queries have AST parse errors`
      );
    }
    if (executionValidCount < queries.length) {
      issues.push(
        `${queries.length - executionValidCount}/${queries.length} queries failed ES execution`
      );
    }
    if (executionHitRate !== null && executionHitRate < 1) {
      issues.push(
        `${
          hitRateDenominator - hitRateNumerator.reduce((a, b) => a + b, 0)
        }/${hitRateDenominator} expect-match queries returned no hits`
      );
    }

    const declaredProactiveRate = queries.length > 0 ? declaredProactiveCount / queries.length : 0;

    // How often the model actually omitted intent. Accepted queries cannot show this under
    // `requireQueryIntent`, so it has to come from the rejected attempts.
    // Reported, not scored: omitting intent is a tool-usage fault, so folding it into the syntax
    // score would move a number that is not about syntax.
    const attempts = getQueryAttempts(output);
    const missingIntentAttemptCount = attempts?.filter(
      (attempt) => attempt.failureReason === 'missing_intent'
    ).length;

    return {
      score,
      explanation:
        issues.length > 0
          ? `${issues.join('; ')} (score=${score.toFixed(2)})`
          : `All ${queries.length} queries have valid syntax and execute successfully`,
      metadata: {
        astSyntaxValidityRate,
        executionSuccessRate,
        executionHitRate,
        includesHitRate,
        matchedCount,
        emptyCount,
        unknownCount,
        declaredProactiveCount,
        declaredProactiveRate,
        proactiveMatchedCount,
        acceptedWithoutIntentCount,
        missingIntentAttemptCount: missingIntentAttemptCount ?? null,
        hitRateDenominator,
        queries: details,
      },
    };
  },
});
