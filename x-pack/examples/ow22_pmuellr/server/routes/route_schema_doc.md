# PostWebhookRuleExampleRequestBody

request body for POST webhook rule example

```typescript
{
  
/** the id of the rule being run */
  ruleId: string;
  
/** execution UUID */
  executionId: string;
  
/** rule parameters */
  params: Record<string, any>;
  
/** old rule state from Kibana */
  state: Record<string, any>;
}
```

# PostWebhookRuleExampleRequestQuery

query string for POST webhook rule example

```typescript
{
  
/** use this param to make all instances active */
  active?: string;
  
/** use this param to make all instances inactive */
  off?: string;
  
/** use this param to make all instances randomly active */
  random?: string;
}
```

# PostWebhookRuleExampleResponseBody

response body for POST webhook rule example

```typescript
{
  
/** new rule state to Kibana */
  state: Record<string, any>;
  
/** one entry for every alert (instance) */
  instances: {
    
/** alert instance id - like host name, service, etc */
    instanceId: string;
    
/** action group */
    actionGroup: string;
    
/** context variables for actions */
    context: Record<string, any>;
  }[];
}
```
