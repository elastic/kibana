# kbn-ink Router

Ink-compatible routing utilities built on `react-router-dom-v5-compat`, designed for CLI UIs using Ink.

This package provides:

- `InkRouter`: A memory router wrapper for Ink apps.
- `InkRoutes` and `InkRoute`: The `@kbn/ink/router` variants of `Routes` and `Route`.
- `RouteMenu`: A helper that renders a navigable menu and generates sub-routes from items.
- `useInkRouter()`: Hook for `go()` (navigate) and `back()` (exit at top level or navigate up).
- `useActiveRoutes()`: Hook to observe currently rendered routes (useful for breadcrumbs or context-aware UI).

## Quick Start

Wrap your app with `InkRouter`, then declare routes using `InkRoutes` and `InkRoute`:

```tsx
import React from 'react';
import { render } from 'ink';
import { InkRouter } from './ink_router';
import { InkRoutes } from './ink_routes';
import { InkRoute } from './ink_route';
import { Outlet } from 'react-router-dom-v5-compat';
import { Text } from 'ink';

const App = () => (
  <InkRouter initialPath="/">
    <InkRoutes>
      <InkRoute element={<Outlet />}>
        <InkRoute path="hello/*" element={<Text>Hello!</Text>} />
      </InkRoute>
    </InkRoutes>
  </InkRouter>
);

render(<App />);
```

## RouteMenu

`RouteMenu` renders a menu. Two kinds of menu items are supported:

- Route options: these allow the user to navigate to a different path.
- Action options: these trigger an onSelect callback when selected.

```tsx
import React from 'react';
import { InkRouter } from './ink_router';
import { RouteMenu } from './route_menu';
import { InkRoutes } from './ink_routes';
import { InkRoute } from './ink_route';
import { Text } from 'ink';

export const App = () => (
  <InkRouter initialPath="/">
    <RouteMenu
      label="Main"
      items={[
        { label: 'Child', path: 'child', element: <Text>child</Text> },
        { label: 'Absolute', path: '/absolute', element: <Text>absolute</Text> },
        {
          label: 'Do Something',
          onSelect() {
            /* do something */
          },
        },
      ]}
    />
  </InkRouter>
);
```

## useInkRouter()

Navigate programmatically and handle back/exit behavior.

```tsx
import React, { useEffect } from 'react';
import { useInkRouter } from './use_ink_router';
import { useLocation } from 'react-router-dom-v5-compat';
import { Text } from 'ink';

export function Navigator({ to }: { to?: string }) {
  const { go, back } = useInkRouter();
  const location = useLocation();

  useEffect(() => {
    if (to) {
      go(to); // relative by default; use '/abs' for absolute
    } else {
      back(); // exits app at top level, or navigates up one nested level
    }
  }, [to, go, back]);

  return <Text>Current: {location.pathname}</Text>;
}
```

Behavior:

- `go(path, options = { relative: 'path' })` normalizes slashes and navigates.
- `back()` uses the current active route stack to navigate up; if already at top level it calls Ink's `exit()`.

## useActiveRoutes()

Observe currently rendered routes, including optional `handle` and URL params. Helpful for breadcrumbs or contextual UI.

```tsx
import React from 'react';
import { useActiveRoutes } from './use_active_routes';
import { Text } from 'ink';

export function Breadcrumbs() {
  const routes = useActiveRoutes();
  return (
    <Text>
      {routes
        .map((r) => r.path)
        .filter(Boolean)
        .join(' / ')}
    </Text>
  );
}
```

## Absolute vs Relative Paths

- Relative paths (e.g. `'child'`) for route menu items inherit the parent's path.
- Prefer relative paths for nested menus; use absolute when jumping to a global location.
