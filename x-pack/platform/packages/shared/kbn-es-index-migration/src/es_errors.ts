/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

/**
 * Runtime classification of a rejected mapping update.
 *
 * The static verifier catches what it can from the declaration, but Elasticsearch is the
 * final authority - a field limit, a dynamically-mapped field, or a rule that changed
 * between versions can all produce a refusal the declaration looks clean for.
 */

interface EsErrorShape {
  type?: string;
  reason?: string;
}

/** Reads the error body from either a raw response or a thrown client error. */
const esErrorOf = (error: unknown): EsErrorShape => {
  const candidate = error as {
    meta?: { body?: { error?: EsErrorShape } };
    body?: { error?: EsErrorShape };
    error?: EsErrorShape;
  };

  return candidate?.meta?.body?.error ?? candidate?.body?.error ?? candidate?.error ?? {};
};

export const esErrorType = (error: unknown): string | undefined => esErrorOf(error).type;

export const esErrorReason = (error: unknown): string | undefined => esErrorOf(error).reason;

/**
 * A field-limit breach is not a mapping conflict, even though Elasticsearch reports it
 * with the same exception type. Only the reason string separates them, and treating the
 * two alike leads to applying a conflict remedy that cannot possibly help.
 */
export const isTotalFieldsBreach = (error: unknown): boolean =>
  /Limit of total fields \[\d+\] has been exceeded/i.test(esErrorReason(error) ?? '');

/**
 * A genuine "Elasticsearch will not apply this" refusal.
 *
 * Both exception types matter: field-level violations raise `illegal_argument_exception`,
 * object-level ones (`enabled`, `subobjects`) raise `mapper_exception`. Matching only the
 * first silently misses the second.
 */
export const isMappingConflict = (error: unknown): boolean => {
  if (isTotalFieldsBreach(error)) {
    return false;
  }
  const type = esErrorType(error);
  return type === 'illegal_argument_exception' || type === 'mapper_exception';
};

export type EsRefusalKind = 'mapping_conflict' | 'total_fields_breach' | 'unknown';

export const classifyEsError = (error: unknown): EsRefusalKind => {
  if (isTotalFieldsBreach(error)) return 'total_fields_breach';
  if (isMappingConflict(error)) return 'mapping_conflict';
  return 'unknown';
};

/**
 * Elasticsearch names the offending field and parameter in its own reason string, so it is
 * quoted verbatim rather than paraphrased.
 */
export const describeEsRefusal = (error: unknown): string => {
  const kind = classifyEsError(error);
  const reason = esErrorReason(error) ?? (error instanceof Error ? error.message : String(error));

  if (kind === 'total_fields_breach') {
    return (
      `${reason}\nThis is a field-count limit, not a mapping conflict. Raise ` +
      `index.mapping.total_fields.limit or add fewer fields - a rollover cannot fix it.`
    );
  }

  return reason;
};
