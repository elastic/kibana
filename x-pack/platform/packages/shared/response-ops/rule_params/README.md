# @kbn/response-ops-rule-params

The package is responsible for the parameters' schema of all rule types. The alerting plugin uses this package to generate OAS documentation for the `params` property in the rule in requests and responses.

## Adding a new rule type

When adding a new rule type, you must register its params schema in the `ruleParamsSchemasWithRuleTypeId` record in [`v1.ts`](./v1.ts). This record drives the discriminated union used in the Create Rule API (`POST /api/alerting/rule`), which enables the OAS documentation to show the correct `params` schema for each `rule_type_id`.

### Steps

1. **Create the params schema** in a new subdirectory (e.g. `my_rule_type/v1.ts`):

   ```typescript
   export const myRuleTypeParamsSchema = schema.object(
     { /* ...your params... */ },
     {
       meta: {
         description: 'The parameters for my rule type.',
       },
     }
   );
   ```

2. **Register it** in `ruleParamsSchemasWithRuleTypeId` in `v1.ts`, providing a human-readable `title` that matches how the rule type appears in the Kibana UI:

   ```typescript
   import { myRuleTypeParamsSchema } from './my_rule_type';

   const ruleParamsSchemasWithRuleTypeId: Record<string, { title: string; params: Type<unknown> }> = {
     // ...existing entries...
     'my.rule_type': { title: 'My rule type', params: myRuleTypeParamsSchema },
   };
   ```

3. **Regenerate the API docs** after making the change:

   ```bash
   node scripts/capture_oas_snapshot --include-path /api/alerting --exclude-path /api/alerting/_health --exclude-path /api/alerting/rule_types
   cd oas_docs && node scripts/merge_ess_oas.js && node scripts/merge_serverless_oas.js
   make api-docs-overlay && make space-aware-api-docs
   ```

   Commit the updated `oas_docs/output/kibana.yaml` and `oas_docs/output/kibana.serverless.yaml` along with your code changes.
