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
