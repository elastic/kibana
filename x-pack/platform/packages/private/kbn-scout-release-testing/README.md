# @kbn/scout-upgrade-testing

Release upgrade testing package for Kibana stateful deployments.

## Overview

This package contains end-to-end tests that verify Kibana functionality across version upgrades in stateful Elastic Cloud deployments. Tests are executed through the [AppEx QA Stateful Cloud Upgrade Tests pipeline](https://buildkite.com/elastic/appex-qa-stateful-cloud-upgrade-tests) and are built using the [@kbn/scout](../kbn-scout) testing framework.

## Purpose

The primary goal of this package is to ensure:

- ✅ Core Kibana features work correctly after version upgrades
- ✅ Data and saved objects persist through upgrade cycles
- ✅ User workflows remain functional across versions

## Testing Framework

Tests are written using **Scout**, Kibana's Playwright-based testing framework, which provides:

- Page object abstractions for Kibana applications
- Elastic Cloud deployment management
- Authentication helpers
- Advanced debugging capabilities

## Directory Structure

```
kbn-scout-release-testing/
├── test/
│   └── scout/
│       └── ui/
│           ├── playwright.config.ts      # Playwright configuration
│           └── discovery_tests/          # Test suites organized by feature
│               └── discovery.spec.ts     # Discover app tests
├── kibana.jsonc                          # Package manifest
├── package.json
├── tsconfig.json
└── README.md
```

## CI/CD Pipeline

Tests run in the [AppEx QA Stateful Cloud Upgrade Tests](https://buildkite.com/elastic/appex-qa-stateful-cloud-upgrade-tests) Buildkite pipeline:

- **Trigger**: Manual triggers, VERSION and UPGRADE_VERSION should be defined as ENV variables
- **Environment**: Stateful Elastic Cloud deployments
- **Upgrade Scenarios**: Tests execute after version upgrades

### Code Owners

This package is maintained by **@elastic/appex-qa**

For questions or support, reach out in:
- Slack: `#appex-qa`

## Related Documentation

- [Scout Framework Documentation](src/platform/packages/shared/kbn-scout/README.md)
- [AppEx QA Buildkite Pipeline](https://buildkite.com/elastic/appex-qa-stateful-cloud-upgrade-tests)
