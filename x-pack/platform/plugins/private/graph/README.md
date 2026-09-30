# Graph app

This is the main source folder of the Graph plugin. It contains all of the Kibana server and client source code. End-to-end coverage lives in [`test/scout`](./test/scout) (Playwright/Scout); see [Run Scout tests](https://www.elastic.co/guide/en/kibana/current/contributing.html) in the Kibana developer guide.

Graph shows only up in the side bar if your server is running on a platinum or trial license. You can activate a trial license in `Management > License Management`.

## Common commands

* Run tests `pnpm test:jest x-pack/platform/plugins/private/graph --watch`
* Run type check `node scripts/type_check.js --project=x-pack/tsconfig.json`
* Run linter `node scripts/eslint.js x-pack/platform/plugins/private/graph`
* Run Scout tests locally (make sure to stop dev server)
  * UI: `node scripts/scout.js run-tests --arch stateful --domain classic --config x-pack/platform/plugins/private/graph/test/scout/ui/playwright.config.ts`
  * API: `node scripts/scout.js run-tests --arch stateful --domain classic --config x-pack/platform/plugins/private/graph/test/scout/api/playwright.config.ts`

## Folder structure

### Client `public/`

State is currently handled by React, Redux Toolkit listener middleware, and the mutable `GraphWorkspace` instance, which manages node and edge state. The remaining workspace state should eventually be integrated into the Redux store.

* `apps/` contains all graph app routes
* `components/` contains react components for various parts of the interface. Components can hold local UI state (e.g. current form data), everything else should be passed in from the caller. Styles should reside in a component-specific stylesheet
* `services/` contains the core workspace logic and functions that encapsulate other parts of Kibana. Stateful dependencies are passed in from the outside. Components should not rely on services directly but have callbacks passed in; Redux listeners coordinate services with state updates.
* `helpers/` contains side effect free helper functions that can be imported and used from components and services
* `state_management/` contains reducers, action creators, selectors, and RTK listeners. It also exports the central store creator.
  * Each file covers one functional area (for example, fields or URL templates).
  * Reducers, action creators, selectors, and listeners for the same functional area generally remain together.
  * Listeners with cross-references between multiple functional areas may move to a separate `<functional_area>_listeners.ts` file to avoid circular imports.
* `types/` contains type definitions for unmigrated `GraphWorkspace` methods
* `router.tsx` is the central entrypoint of the app


### Server `server/`

The Graph server is only forwarding requests to Elasticsearch API and contains very little logic. It will be rewritten soon.
