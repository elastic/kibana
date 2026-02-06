# @kbn/ink

Library for creating CLI tools using `ink`.

## `prepareInk`

`ink` uses top-level await, which we currently do not support in our repository because we compile to CommonJS. For this reason, `@kbn/ink` exposes `prepareInk`, which will A) load the `ink` module using a dynamic import that is _not_ compiled to CommonJS, B) intercept successive CommonJS requires to `ink` and return the module we've loaded. \*\*Make sure to call this before anything else tries to laod `ink`:

```ts
async function renderApp() {
  const { prepareInk } = await import('@kbn/ink');

  const { render } = await prepareInk();

  // MyApp imports `ink` so should be called after calling `prepareInk`
  const { MyApp } = await import('./MyApp');

  const { unmount, waitUntilExit } = render(<MyApp />);
}
```

**Note**: `@kbn/ink` only contains `prepareInk`, because exporting modules that import `ink` would break before we have a chance to intercept the requires.

## `Menu`

A simple menu component that renders a list of options, and can be navigated with the keyboard. Can be imported from `@kbn/ink/menu`.

## `@kbn/ink/router`

Exports an `ink`-compatible router, and a `RouteMenu` component, that can be used to create hierarchical menus and deeplinking. Can be imported from `@kbn/ink/router`.

[@kbn/ink/router README.md](./src/router/README.md) for more.
