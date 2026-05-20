import type { ESQLAstCommand } from '@elastic/esql/types';
import type { RegisteredDomainProcessor } from '../../../../types/processors';
/**
 * Converts a Streamlang RegisteredDomainProcessor into a list of ES|QL AST commands.
 * - When `ignore_missing: false`: `WHERE NOT(fqdn IS NULL)` filters missing fields
 *
 * @example Unconditional:
 *    ```typescript
 *    const streamlangDSL: StreamlangDSL = {
 *      steps: [
 *        {
 *          action: 'registered_domain',
 *          expression: 'fqdn',
 *          prefix: 'domain',
 *        } as RegisteredDomainProcessor,
 *      ],
 *    };
 *    ```
 *
 *    Generates:
 *    ```txt
 *    | REGISTERED_DOMAIN __streamlang_registered_domain = fqdn
 *    | EVAL `domain.domain`              = COALESCE(`__streamlang_registered_domain.domain`,             `domain.domain`),
 *           `domain.registered_domain`   = COALESCE(`__streamlang_registered_domain.registered_domain`,  `domain.registered_domain`),
 *           `domain.subdomain`           = COALESCE(`__streamlang_registered_domain.subdomain`,           `domain.subdomain`),
 *           `domain.top_level_domain`    = COALESCE(`__streamlang_registered_domain.top_level_domain`,    `domain.top_level_domain`)
 *    | DROP `__streamlang_registered_domain.domain`, `__streamlang_registered_domain.registered_domain`, `__streamlang_registered_domain.subdomain`, `__streamlang_registered_domain.top_level_domain`
 *    ```
 *
 * @example Conditional:
 *    ```typescript
 *    const streamlangDSL: StreamlangDSL = {
 *      steps: [
 *        {
 *          action: 'registered_domain',
 *          expression: 'fqdn',
 *          prefix: 'domain',
 *          where: { field: 'fqdn', exists: true },
 *        } as RegisteredDomainProcessor,
 *      ],
 *    };
 *    ```
 *
 *    Generates:
 *    ```txt
 *    | EVAL __streamlang_registered_domain_expression = CASE(NOT(fqdn IS NULL), fqdn, "")
 *    | REGISTERED_DOMAIN __streamlang_registered_domain = __streamlang_registered_domain_expression
 *    | EVAL `domain.domain`              = COALESCE(`__streamlang_registered_domain.domain`,            `domain.domain`),
 *           `domain.registered_domain`   = COALESCE(`__streamlang_registered_domain.registered_domain`, `domain.registered_domain`),
 *           `domain.subdomain`           = COALESCE(`__streamlang_registered_domain.subdomain`,          `domain.subdomain`),
 *           `domain.top_level_domain`    = COALESCE(`__streamlang_registered_domain.top_level_domain`,   `domain.top_level_domain`)
 *    | DROP `__streamlang_registered_domain.domain`, `__streamlang_registered_domain.registered_domain`, `__streamlang_registered_domain.subdomain`, `__streamlang_registered_domain.top_level_domain`, `__streamlang_registered_domain_expression`
 *    ```
 */
export declare function convertRegisteredDomainProcessorToESQL(processor: RegisteredDomainProcessor): ESQLAstCommand[];
