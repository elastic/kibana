# Serverless Navigation

Serverless-specific navigation components for Kibana.

> **Note**: This module provides navigation for serverless deployments. For stateful deployments, see the [Shared Navigation Plugin](/src/platform/plugins/shared/navigation/README.md) implementation, which uses a different registration mechanism (`addSolutionNavigation`).

## Plugin Start Contract

The serverless plugin's start contract provides the following navigation-related methods:

```typescript
interface ServerlessPluginStart {
  // Register a navigation tree and set up the SideNavComponent
  initNavigation: (
    id: string, 
    navigationTree$: Observable<NavigationTreeDefinition>,
    options?: { dataTestSubj?: string }
  ) => void;
  
  // Set breadcrumbs for the current page
  setBreadcrumbs: (breadcrumbs, params) => void;
  
  // Set the project home URL
  setProjectHome: (homeHref: string) => void;
  
  // Get navigation cards for a Stack Management landing page
  getNavigationCards: (
    roleManagementEnabled: boolean,
    extendCardNavDefinitions?: Record<string, CardNavExtensionDefinition>
  ) => Record<string, CardNavExtensionDefinition>;
}
```

## Components

- **SideNavComponent**: A lazily-loaded wrapper that integrates with the core Navigation component
- **Navigation Cards**: Utilities for generating cards for a landing page in Stack Management

## Integration

This module connects the serverless plugin with Kibana's core navigation system by:

1. Providing a serverless-specific implementation of SideNavComponent
2. Using NavigationKibanaProvider to connect with core navigation services
3. Exposing navigation card generators for a Stack Management landing page

## Usage

### Registering Navigation Trees

Serverless plugins register their navigation trees using the `initNavigation` method:

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
  plugins.serverless.initNavigation(
    'your-plugin-id',
    navigationTree$,
    { dataTestSubj: 'yourPluginNavigation' }
  );
}
```

### Using Navigation Cards

The serverless plugin provides utilities for generating navigation cards for a landing page in Stack Management:

```typescript
const { getNavigationCards } = plugins.serverless;
const navCards = getNavigationCards(true); // true if role management is enabled
```