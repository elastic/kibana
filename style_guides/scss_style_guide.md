
# SCSS Style Guide

## Original style guide

Our style guide is an extension of [Sass Guidelines by Hugo Giraudel](https://sass-guidelin.es/). The rules we especially focus on are:

* [Syntax & formatting](https://sass-guidelin.es/#syntax--formatting) (exceptions below)
* [Naming conventions](https://sass-guidelin.es/#naming-conventions) (see the [CSS Style Guide](css_style_guide.md) for infomation on exceptions)
* [Variables](https://sass-guidelin.es/#variables)
* [Mixins](https://sass-guidelin.es/#mixins)


## Responsive layouts

Kibana aims to provide at least a read-only (meaning, editing and controls can be hidden) on layouts when on a small device. We place any responsive Sass at the bottom of our SCSS documents, rather than intermingled within the components themselves.

```
// Good
@include component('kuiHeader') {
  display: block;
}

@include screenSmall {
  @include component('kuiHeader') {
    display: none;
  }
}

// Bad
@include component('kuiHeader') {
  display: block;

  @include screenSmall {
    display: none;
  }
}
```

## Syntax and formatting

The Sass Guidelines site recommends using RBG and HSL values to format colors, but we're using
hex values.

### Bemify for namespacing components

We use [bemify](https://github.com/franzheidl/bemify) for namespacing the sass into a BEM format. We use `component`, `child`, `modifier` and `state` as our mixin names. We've adjusted the plugin's state mixin so that you need to write out the full selector (`@include state('isHappening')`).

#### Example

```
// Generates .kuiButton
@include component('kuiButton') {
  color: white;
  background: gray;
  padding: 20px;

  // Generates .kuiButton__icon
  @include child('icon') {
    display: inline-block;
    margin-right: 4px;
    color: white;

    // Generates .kuiButton__icon--danger
    @include modifier('danger') {
      color: red;
    }
  }

  // Generates .kuiButton--primary
  @include modifier('primary') {
    background: blue;
  }

  // Generates .kuiButton.isLoading
  @include state('isLoading') {
    opacity: .5;
    cursor: not-allowed;
  }
}
```

### Utility class naming

KUI includes utility classes in `global_styles/utility` which are used to cut down on the amount of duplicate CSS we write and make designing in code faster. Utilities include the `kui--` prefix, since we consider them modifiers to KUI as a whole.

```
<div class="kuiSomeComponent kui--flexRow">
```

There is also a mixin for creating these utilities in the Sass.

```
@include utility('flexRow') {
  display: flex;
  flex-direction: row;
}
```

## Dealing with extends

Don't extend classes. The only time use should use an extend is when you are extending a placeholder. Even then, do it rarely and only for code maintainability.

## Variable naming and coloring

KUI is fully themeable. We do this with strict variable naming. Please use the following rules.

* Global vars that can be used across all of KUI should be placed in the `global_styles/variables` directory.
* Component vars that are local to the component should be places in the `component/component_name/index.scss` file at the top of the document.
* Component vars that deal with coloring should *always* be mathematically calculated from the global coloring variables. This allows us to cascade theming down into the components.
