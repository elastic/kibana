/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { runInNewContext } from 'vm';

interface CodeEvaluatorResult {
  score: number;
  label?: string;
  explanation?: string;
}

interface CodeEvaluatorParams {
  input: unknown;
  output: unknown;
  expected: unknown;
  metadata: unknown;
}

interface LlmJudgeConfig {
  promptTemplate: string;
  scoringMode: string;
  feedbackKey: string;
}

interface LlmJudgeParams {
  input: unknown;
  output: unknown;
  expected: unknown;
}

interface InferenceClient {
  chatComplete: (params: {
    messages: Array<{ role: string; content: string }>;
  }) => Promise<{ content?: string }>;
}

interface EsqlEvaluatorConfig {
  queryTemplate: string;
  scoreExpression: string;
  passCondition: string;
}

interface EsqlEvaluatorParams {
  input: unknown;
  output: unknown;
}

interface ElasticsearchClient {
  esql: {
    query: (params: { query: string; format: string }) => Promise<{
      columns?: Array<{ name: string; type: string }>;
      values?: unknown[][];
    }>;
  };
}

const deepFreeze = <T>(obj: T): T => {
  if (obj === null || typeof obj !== 'object') {
    return obj;
  }
  Object.freeze(obj);
  for (const value of Object.values(obj as Record<string, unknown>)) {
    deepFreeze(value);
  }
  return obj;
};

export const executeCodeEvaluator = (
  functionBody: string,
  params: CodeEvaluatorParams
): CodeEvaluatorResult => {
  // Create a null-prototype sandbox to prevent constructor chain escapes
  const sandbox = Object.create(null);

  // Only provide cloned, frozen copies of user data (no constructor chains)
  sandbox.input = deepFreeze(structuredClone(params.input));
  sandbox.output = deepFreeze(structuredClone(params.output));
  sandbox.expected = deepFreeze(structuredClone(params.expected));
  sandbox.metadata = deepFreeze(structuredClone(params.metadata));

  // Safe math/string utilities as plain functions (not constructor-bearing objects)
  sandbox.jsonParse = (str: string) => JSON.parse(str);
  sandbox.jsonStringify = (val: unknown) => JSON.stringify(val);
  sandbox.mathAbs = Math.abs;
  sandbox.mathFloor = Math.floor;
  sandbox.mathCeil = Math.ceil;
  sandbox.mathRound = Math.round;
  sandbox.mathMin = Math.min;
  sandbox.mathMax = Math.max;
  sandbox.mathSqrt = Math.sqrt;
  sandbox.parseFloat = parseFloat;
  sandbox.parseInt = parseInt;
  sandbox.isNaN = isNaN;
  sandbox.isFinite = isFinite;
  sandbox.regexTest = (pattern: string, flags: string, str: string) => {
    if (pattern.length > 200) throw new Error('Regex pattern too long (max 200 chars)');
    return new RegExp(pattern, flags).test(str);
  };
  sandbox.regexMatch = (pattern: string, flags: string, str: string) => {
    if (pattern.length > 200) throw new Error('Regex pattern too long (max 200 chars)');
    return str.match(new RegExp(pattern, flags));
  };
  sandbox.includes = (str: string, search: string) => String(str).includes(search);
  sandbox.startsWith = (str: string, search: string) => String(str).startsWith(search);
  sandbox.toLowerCase = (str: string) => String(str).toLowerCase();
  sandbox.toUpperCase = (str: string) => String(str).toUpperCase();
  sandbox.split = (str: string, sep: string) => String(str).split(sep);
  sandbox.length = (val: string | unknown[]) =>
    typeof val === 'string' ? val.length : Array.isArray(val) ? val.length : 0;

  const wrappedCode = `(function() { ${functionBody} })()`;
  const result = runInNewContext(wrappedCode, sandbox, { timeout: 5000 });

  if (typeof result === 'number') {
    const safeScore = Number.isFinite(result) ? result : 0;
    return { score: safeScore };
  }
  if (typeof result === 'boolean') {
    return { score: result ? 1.0 : 0.0, label: result ? 'pass' : 'fail' };
  }
  if (result && typeof result === 'object' && 'score' in result) {
    const obj = result as CodeEvaluatorResult;
    const safeScore = Number.isFinite(obj.score) ? obj.score : 0;
    return { ...obj, score: safeScore };
  }

  throw new Error(
    'Code evaluator must return a number, boolean, or { score, label?, explanation? }'
  );
};

export const executeLlmJudgeEvaluator = async (
  config: LlmJudgeConfig,
  params: LlmJudgeParams,
  inferenceClient: InferenceClient
): Promise<CodeEvaluatorResult> => {
  const prompt = config.promptTemplate
    .replace(/\{input\}/g, JSON.stringify(params.input))
    .replace(
      /\{output\}/g,
      typeof params.output === 'string' ? params.output : JSON.stringify(params.output)
    )
    .replace(/\{reference\}/g, JSON.stringify(params.expected ?? ''));

  const response = await inferenceClient.chatComplete({
    messages: [{ role: 'user', content: prompt }],
  });

  const responseText = response.content ?? '';

  const jsonMatch = responseText.match(/\{[\s\S]*?\}/);
  if (!jsonMatch) {
    throw new Error('LLM judge did not return valid JSON');
  }

  let parsed: Record<string, unknown>;
  try {
    parsed = JSON.parse(jsonMatch[0]);
  } catch (e) {
    throw new Error(
      `LLM judge returned invalid JSON: ${e instanceof Error ? e.message : String(e)}`
    );
  }

  const parsedObj = parsed as Record<string, unknown>;

  if (config.scoringMode === 'boolean') {
    const score =
      parsedObj.score === true || parsedObj.score === 'true' || parsedObj.score === 1 ? 1.0 : 0.0;
    return {
      score,
      label: score === 1.0 ? 'pass' : 'fail',
      explanation: String(parsedObj.explanation ?? ''),
    };
  }

  const rawScore = Number(parsedObj.score);
  const score = Number.isFinite(rawScore) ? rawScore : 0;

  return {
    score,
    label: parsedObj.label != null ? String(parsedObj.label) : undefined,
    explanation: String(parsedObj.explanation ?? parsedObj.reasoning ?? ''),
  };
};

/**
 * Safe expression evaluator for simple numeric expressions.
 * Supports patterns like:
 *   "row_count > 0 ? 1.0 : 0.0"
 *   "values[0][0] / 100"
 *   "score >= 0.5"
 *   "row_count"
 */
export const evaluateSimpleExpression = (
  expression: string,
  context: Record<string, unknown>
): number => {
  // Create a minimal sandbox with only the context values
  const sandbox = Object.create(null);
  for (const [key, value] of Object.entries(context)) {
    sandbox[key] = deepFreeze(structuredClone(value));
  }

  const wrappedCode = `(function() { return (${expression}); })()`;
  const result = runInNewContext(wrappedCode, sandbox, { timeout: 1000 });

  if (typeof result === 'boolean') {
    return result ? 1.0 : 0.0;
  }
  if (typeof result === 'number') {
    return result;
  }

  return 0;
};

export const executeEsqlEvaluator = async (
  config: EsqlEvaluatorConfig,
  params: EsqlEvaluatorParams,
  esClient: ElasticsearchClient
): Promise<CodeEvaluatorResult> => {
  // 1. Resolve template variables in queryTemplate
  const query = config.queryTemplate
    .replace(/\{input\}/g, JSON.stringify(params.input))
    .replace(
      /\{output\}/g,
      typeof params.output === 'string' ? params.output : JSON.stringify(params.output)
    );

  // 2. Execute ES|QL query
  const result = await esClient.esql.query({ query, format: 'json' });

  // 3. Extract score using scoreExpression
  const rowCount = result.values?.length ?? 0;
  const columns = result.columns ?? [];
  const values = result.values ?? [];

  const expressionContext: Record<string, unknown> = {
    row_count: rowCount,
    columns,
    values,
    result,
  };

  const rawScore = evaluateSimpleExpression(config.scoreExpression, expressionContext);
  const score = Number.isFinite(rawScore) ? rawScore : 0;

  // 4. Determine pass/fail
  const pass = evaluateSimpleExpression(config.passCondition, { score, row_count: rowCount }) > 0;

  return {
    score,
    label: pass ? 'pass' : 'fail',
    explanation: `ES|QL returned ${rowCount} rows. Score: ${score}`,
  };
};
