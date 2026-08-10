# Serverless Navigation

Serverless-specific navigation components for Kibana.

> **Note**: This module provides navigation for serverless deployments. For stateful deployments, see the [Shared Navigation Plugin](/src/platform/plugins/shared/navigation/README.md) implementation, which uses a different registration mechanism (`addSolutionNavigation`).

## Plugin Start Contract

The serverless plugin's start contract provides the following navigation-related methods:

```typescript
interface ServerlessPluginStart {
  // Set breadcrumbs for the current page
  setBreadcrumbs: (breadcrumbs, params) => void;

  // Get navigation cards for a Stack Management landing page
  getNavigationCards: (
    roleManagementEnabled: boolean,
    extendCardNavDefinitions?: Record<string, CardNavExtensionDefinition>
  ) => Record<string, CardNavExtensionDefinition>;
}
```

Navigation tree registration is not part of this contract. Serverless plugins register via
`navigation.initNavigation()` (from `@kbn/navigation-plugin/public`), which is the single entry
point into core's `ProjectNavigationService` — see the
[Shared Navigation Plugin](/src/platform/plugins/shared/navigation/README.md).

## Components

- **Navigation Cards**: Utilities for generating cards for a landing page in Stack Management

## Integration

This module connects the serverless plugin with Kibana's core navigation system by:

1. Exposing navigation card generators for a Stack Management landing page.
2. Setting breadcrumbs for the current page.

Navigation tree registration (and the connection to `ProjectNavigationService`) is owned by the
`navigation` plugin — see [Usage](#usage) below.

## Usage

### Registering Navigation Trees

Serverless plugins register their navigation trees using the navigation plugin's
`initNavigation` method, which guarantees the user's stored customization is seeded before the
navigation tree is registered:

```typescript
// In your plugin's start method
public start(core: CoreStart, plugins: PluginsStart) {
  // Create a navigation tree observable
  const navigationTree$ = new BehaviorSubject<NavigationTreeDefinition>({
    id: 'root',
    title: 'Root',
    items: [
      // Your navigation items
    ],
  });

  // Register your navigation tree
  plugins.navigation.initNavigation('your-plugin-id', navigationTree$);
}
```

### Using Navigation Cards

The serverless plugin provides utilities for generating navigation cards for a landing page in Stack Management:

```typescript
const { getNavigationCards } = plugins.serverless;
const navCards = getNavigationCards(true); // true if role management is enabled
```
