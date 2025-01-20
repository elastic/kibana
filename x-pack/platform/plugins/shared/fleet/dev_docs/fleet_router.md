# Fleet router

All the fleet API routes are wrapped with a custom handler see [fleet_router](../server/services/security/fleet_router.ts) that provides error handling and security.

## Error handling

All non catched errors in Fleet API will go throuh a default error handler, that will allow to transform known error in response with predefined status code.

## Security

Fleet router also provide an easy way to declare authorization rules for Fleet routes. This can be done via the `fleetAuthz` property via a function or an object with required roles.

Examples:

```typescript
router.versioned.get({
  path: OUTPUT_API_ROUTES.LIST_PATTERN,
  fleetAuthz: (authz) => {
    return authz.fleet.readSettings || authz.fleet.readAgentPolicies;
  },
  summary: 'Get outputs',
});
```

```typescript
router.versioned.post({
  path: OUTPUT_API_ROUTES.CREATE_PATTERN,
  fleetAuthz: {
    fleet: { allSettings: true },
  },
  summary: 'Create output',
});
```
