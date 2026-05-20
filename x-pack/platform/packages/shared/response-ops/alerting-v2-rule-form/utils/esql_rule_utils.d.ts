import { type ESQLControlVariable } from '@kbn/esql-types';
export interface InlineEsqlVariablesResult {
    /** Query with all resolvable `?param` / `??param` tokens substituted. */
    query: string;
    /**
     * Tokens (with their `?` / `??` prefix) that remain in the output query
     * because no Control resolved them, the value was unsubstitutable, or
     * Composer rejected the substitution.
     */
    unresolved: string[];
}
/**
 * Composer's `inlineParam` supports: string / number / homogeneous non-empty
 * arrays of those (emitted as list literals, e.g. `("a", "b")`) / identifiers
 * via `??`. `time_literal` is excluded because Composer has no duration-aware
 * mode — a string value gets quoted and breaks the query.
 */
export declare const esqlControlVariableIsComposerInlinable: (v: ESQLControlVariable) => boolean;
/**
 * Inline `?param` / `??param` Control bindings into an ES|QL query.
 */
export declare const inlineEsqlVariables: (query: string, esqlVariables: ESQLControlVariable[] | undefined) => InlineEsqlVariablesResult;
