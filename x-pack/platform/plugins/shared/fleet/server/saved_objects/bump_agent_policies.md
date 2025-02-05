## Agent policy SO changes

When making changes to agent policy SO, the changes are not automatically deployed to agents. To trigger an agent policy bump, add a new model version to the agent policy SO type with a revision increase.

```
        '2': {
          changes: [
            {
              type: 'data_backfill',
              backfillFn: (doc) => {
                return { attributes: { ...doc.attributes, revision: doc.attributes.revision + 1 } };
              },
            },
          ],
        },
```

## Package policy SO changes

Similarly, package policy SO changes do not automatically trigger a redeploy of agent policies using them. To trigger an agent policy bump using package policies, add a new model version to the package policy SO type with `bump_agent_policy_revision: true`.

```
   '2': {
          changes: [
            {
              type: 'data_backfill',
              backfillFn: (doc) => {
                return { attributes: { ...doc.attributes, bump_agent_policy_revision: true } };
              },
            },
          ],
        },
```