# Angular Style Guide

Kibana is written in Angular, and uses several utility methods to make using
Angular easier.

## Defining modules

Angular modules are defined using a custom require module named `ui/modules`.
It is used as follows:

```js
const app = require('ui/modules').get('app/namespace');
```

`app` above is a reference to an Angular module, and can be used to define
controllers, providers and anything else used in Angular. While you can use
this module to create/get any module with ui/modules, we generally use the
"kibana" module for everything.

## Promises

A more robust version of Angular's `$q` service is available as `Promise`. It
can be used in the same way as `$q`, but it comes packaged with several utility
methods that provide many of the same useful utilities as Bluebird.

```js
app.service('CustomService', (Promise, someFunc) => {
  new Promise((resolve, reject) => {
    ...
  });

  const promisedFunc = Promise.cast(someFunc);

  return Promise.resolve('value');
});
```

### Routes

Angular routes are defined using a custom require module named `routes` that
removes much of the required boilerplate.

```js
import routes from 'ui/routes';

routes.when('/my/object/route/:id?', {
  // angular route code goes here
});
```

## Private modules

A service called `Private` is available to load any function as an angular
module without needing to define it as such. It is used as follows:

```js
import PrivateExternalClass from 'path/to/some/class';
app.controller('myController', function($scope, otherDeps, Private) {
  const ExternalClass = Private(PrivateExternalClass);
  ...
});
```

**Note:** Use this sparingly. Whenever possible, your modules should not be
coupled to the angular application itself.

## Directives

### Use callbacks to communicate side effects up the hierarchy

  - Treat attribute bindings as read-only and communicate with with the parent
    directive via callbacks. Essentially treat directive attribute bindings
    like function arguments, which should also not be mutated.

    *Why?*: Spreading mutable state throughout the application makes it very
    difficult to understand and predict. By receiving data from the parent
    through the bindings and communicating desired changes back via separate
    callback attributes the data flow becomes explicit. The attribute bindings
    then become the public interface of the component, describing all the
    inputs dictating the rendering and all possible effects on the application
    state.

  ```javascript
  /* avoid */
  module.directive('myBadTableHeader', function MyBadTableHeader() {
    return {
      bindToController: true,
      controllerAs: 'tableHeader',
      controller: TableHeaderController,
      replace: true,
      scope: {
        caption: '=',
        sortColumn: '=',
      },
      template: `<th
        ng-class="{ 'tableHeader--sortColumn': tableHeader.isSortColumn() }"
        ng-bind="tableHeader.caption"
        ng-click="tableHeader.sort()"
      ></th>`,
    };
  });

  function TableHeaderController() {
    this.isSortColumn = () => (
      this.sortColumn === this.caption
    );

    this.sort = () => (
      this.sortColumn = this.caption  // AVOID: mutating input attributes
    );

    /* OTHER STUFF */
  }
  ```

  ```javascript
  /* recommended */
  module.directive('myGoodTableHeader', function MyGoodTableHeader() {
    return {
      bindToController: true,
      controllerAs: 'tableHeader',
      controller: TableHeaderController,
      replace: true,
      scope: {
        caption: '=',          // INPUT
        isSortColumn: '=',     // INPUT
        onChangeSorting: '=',  // EFFECT
      },
      template: `<th
        ng-class="{ 'tableHeader--sortColumn': tableHeader.isSortColumn() }"
        ng-bind="tableHeader.caption"
        ng-click="tableHeader.onChangeSorting()"
      ></th>`,
    };
  });

  function TableHeaderController() {
    /* OTHER STUFF */
  }
  ```

### Push state and business logic to the top

  - Design the directives in such a way, that they require minimal knowledge
    about the overall application state. In particular, only pass attributes
    and callbacks that are required for the purpose of that directive down the
    hierarchy. Concentrate state and state mutations in "container directives"
    that are used sparingly and as high up in the component hierarchy as
    possible.

    *Why?*: Using complex data structures in interfaces tends to break
    abstraction layer boundaries and couple components closely, thereby
    limiting reuse and hindering refactoring. The purpose of most directives
    should be to be as "dumb" as possible and just translate the attribute
    bindings into DOM elements. Container directives can concentrate business
    logic in the choice of the attributes they pass to their children and
    encapsulate state changes by passing callbacks.

    *Note*: Of course there is a sweet spot about where in the hierarchy to put
    the container directives, that are specific to each situation. In general
    though, having a container component for the whole application and possibly
    for each larger sub-section of the application has proven useful.

  ```javascript
  /* avoid */
  module.directive('myBadTableHeader', function MyBadTableHeader() {
    return {
      bindToController: true,
      controllerAs: 'tableHeader',
      controller: TableHeaderController,
      replace: true,
      scope: {
        fieldData: '=',
        query: '=',
      },
      template: `<th
        ng-bind="tableHeader.fieldData.name"
        ng-class="{ 'tableHeader--sortColumn': tableHeader.query.sort[0] === tableHeader.fieldData.name }"
        ng-click="tableHeader.query.sort = [tableHeader.fieldData.name, 'asc']"
      ></th>`,  // AVOID: too much knowledge about high-level application state
    };
  });
  ```

  ```javascript
  /* recommended */
  module.directive('myGoodTableHeader', function MyGoodTableHeader() {
    return {
      bindToController: true,
      controllerAs: 'tableHeader',
      controller: TableHeaderController,
      replace: true,
      scope: {
        caption: '=',        // RECOMMENDED: let the parent pass the specific
        isSortColumn: '=',   // attributes required for this directive's purpose
        onChangeSorting: '=',
      },
      template: `<th
        ng-bind="tableHeader.caption"
        ng-class="{ 'tableHeader--sortColumn': tableHeader.isSortColumn }"
        ng-click="tableHeader.onChangeSorting('asc')"
      ></th>`,
    };
  });
  ```

### Name attributes consistently

  - Prefix attributes with values of boolean type with `is` or `has`.

    ```html
    /* avoid */
    <time-picker expand="true">

    <time-picker icon="false">
    ```

    ```html
    /* recommended */
    <time-picker is-expanded="true">

    <time-picker has-icon="false">
    ```

  - Prefix callback attributes with `on` and choose a name that indicates the
    source of the action.

    *Why?*: The `on` prefix clearly distiguishes the effect callbacks from the
    input attributes. It also focuses the name on the concern of the ui
    component and does not imply knowledge about the consequences, which are
    determined by the parent that passes the callback.

    ```html
    /* avoid */
    <time-picker set-start-date="query.loadWithStartDate">
    ```

    ```html
    /* recommended */
    <time-picker on-change-start="query.loadWithStartDate">
    ```
