import type { ESQLAstCommand } from '@elastic/esql/types';
import type { RedactProcessor } from '../../../../types/processors';
/**
 * Converts a Streamlang RedactProcessor into a list of ES|QL AST commands.
 *
 * Since ES|QL doesn't have a native redact command, we emulate it using replace():
 * 1. Compile each Grok pattern (e.g., "%{IP:client}") to a regular expression
 * 2. For each pattern, generate an EVAL with replace() to mask the matched content
 * 3. The replacement is the semantic name wrapped in prefix/suffix (e.g., "<client>")
 *
 * For unconditional redaction (no 'where' or 'where: always'):
 *   Uses EVAL with replace() function for each pattern
 *
 * For conditional redaction (with 'where' condition):
 *   Uses EVAL with CASE for each pattern
 *
 * Filters applied for Ingest Pipeline parity:
 * - When `ignore_missing: false`: `WHERE NOT(field IS NULL)` filters missing fields
 *
 * @example Single pattern:
 *    ```typescript
 *    const streamlangDSL: StreamlangDSL = {
 *      steps: [
 *        {
 *          action: 'redact',
 *          from: 'message',
 *          patterns: ['%{IP:client}'],
 *        } as RedactProcessor,
 *      ],
 *    };
 *    ```
 *
 *    Generates:
 *    ```txt
 *    | EVAL message = replace(message, "<IP_REGEX>", "<client>")
 *    ```
 *
 * @example Multiple patterns with custom delimiters:
 *    ```typescript
 *    const streamlangDSL: StreamlangDSL = {
 *      steps: [
 *        {
 *          action: 'redact',
 *          from: 'message',
 *          patterns: ['%{IP:client}', '%{EMAILADDRESS:email}'],
 *          prefix: '[',
 *          suffix: ']',
 *        } as RedactProcessor,
 *      ],
 *    };
 *    ```
 *
 *    Generates:
 *    ```txt
 *    | EVAL message = replace(message, "<IP_REGEX>", "[client]")
 *    | EVAL message = replace(message, "<EMAIL_REGEX>", "[email]")
 *    ```
 *
 * @example Conditional:
 *    ```typescript
 *    const streamlangDSL: StreamlangDSL = {
 *      steps: [
 *        {
 *          action: 'redact',
 *          from: 'message',
 *          patterns: ['%{IP:client}'],
 *          where: { field: 'status', eq: 'production' },
 *        } as RedactProcessor,
 *      ],
 *    };
 *    ```
 *
 *    Generates:
 *    ```txt
 *    | EVAL message = CASE(status == "production", replace(message, "<IP_REGEX>", "<client>"), message)
 *    ```
 */
export declare function convertRedactProcessorToESQL(processor: RedactProcessor): ESQLAstCommand[];
