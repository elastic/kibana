# Significant Events - Scout API Tests

Scout API tests for the Significant Events plugin. These exercise server-side API functionality
without browser interaction, giving fast and reliable coverage of the route repository.

## Directory structure

```
api/
├── playwright.config.ts                        # Scout API test configuration
├── fixtures/
│   ├── index.ts                                # `significantEventsApiTest`, extending apiTest
│   └── constants.ts                            # Role definitions and API headers
├── services/
│   └── significant_events_api_service.ts       # Typed helper over the route repository
└── tests/
    ├── global.setup.ts                         # Enables Streams + the availability feature flag
    ├── global.teardown.ts                      # Reverts the flag, disables Streams
    ├── memory_and_investigation/memory_crud.spec.ts
    ├── significant_events/onboarding_bulk_status.spec.ts
    └── workflows/managed_workflows.spec.ts
```

## Running

```bash
node scripts/scout run-tests --arch stateful --domain classic \
  --config x-pack/platform/plugins/shared/significant_events/test/scout/api/playwright.config.ts
```

Significant events is gated behind the `streams.significantEventsAvailable` feature flag, which
defaults to false. `global.setup.ts` forces it on for the run and `global.teardown.ts` reverts it —
without that, every route returns a 403.

## Writing new tests

```typescript
import { significantEventsApiTest as apiTest } from '../../fixtures';
import { COMMON_API_HEADERS } from '../../fixtures/constants';

apiTest.beforeAll(async ({ samlAuth }) => {
  const credentials = await samlAuth.asStreamsAdmin();
  adminCookieHeader = credentials.cookieHeader;
});
```

## Related suites

Significant-events API coverage is split across three places; several routes are reachable only
from the second:

- **this suite** — memory CRUD, KI onboarding bulk status, managed workflows
- `x-pack/platform/test/api_integration_deployment_agnostic/apis/significant_events/` — FTR
  deployment-agnostic tests, run behind the significant-events feature-flag configs
- `x-pack/platform/packages/shared/kbn-evals-suite-significant-events/` — LLM evaluation suites
