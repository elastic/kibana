# JavaScript Style Guide

## Attribution

This JavaScript guide forked from the [node style guide](https://github.com/felixge/node-style-guide) created by [Felix Geisendörfer](http://felixge.de/) and is
licensed under the [CC BY-SA 3.0](http://creativecommons.org/licenses/by-sa/3.0/)
license.

## 2 Spaces for indention

Use 2 spaces for indenting your code and swear an oath to never mix tabs and
spaces - a special kind of hell is awaiting you otherwise.

## Newlines

Use UNIX-style newlines (`\n`), and a newline character as the last character
of a file. Windows-style newlines (`\r\n`) are forbidden inside any repository.

## No trailing whitespace

Just like you brush your teeth after every meal, you clean up any trailing
whitespace in your JS files before committing. Otherwise the rotten smell of
careless neglect will eventually drive away contributors and/or co-workers.

## Use Semicolons

According to [scientific research][hnsemicolons], the usage of semicolons is
a core value of our community. Consider the points of [the opposition][], but
be a traditionalist when it comes to abusing error correction mechanisms for
cheap syntactic pleasures.

[the opposition]: http://blog.izs.me/post/2353458699/an-open-letter-to-javascript-leaders-regarding
[hnsemicolons]: http://news.ycombinator.com/item?id=1547647

## 120 characters per line

Try to limit your lines to 80 characters. If it feels right, you can go up to 120 characters.

## Use `const` for variables

Your variable references should rarely be mutable, so use `const` for almost
everything. If you absolutely *must* mutate a reference, use `let`.

```js
// good
const foo = 'bar';

// if absolutely necessary, OK
let foo;

// bad
var foo = 'bar';
```

## Use single quotes for fixed strings

Use single quotes, unless you are writing JSON.

```js
// good
const foo = 'bar';

// bad
const foo = "bar";
```

## Use template strings to interpolate variables into strings

```js
// good
const foo = `Hello, ${name}`;

// bad
const foo = 'Hello, ' + name;
```

## Use template strings to avoid escaping single quotes

Because readability is paramount.

```js
// good
const foo = `You won't believe this.`;

// bad
const foo = 'You won\'t believe this.';
```

## Use object destructuring

This helps avoid temporary references and helps prevent typo-related bugs.

```js
// best
function fullName({ first, last }) {
  return `${first} ${last}`;
}

// good
function fullName(user) {
  const { first, last } = user;
  return `${first} ${last}`;
}

// bad
function fullName(user) {
  const first = user.first;
  const last = user.last;
  return `${first} ${last}`;
}
```

## Use array destructuring

Directly accessing array values via index should be avoided, but if it is
necessary, use array destructuring:

```js
const arr = [1, 2, 3];

// good
const [first, second] = arr;

// bad
const first = arr[0];
const second = arr[1];
```

## Opening braces go on the same line

Your opening braces go on the same line as the statement.

```js
// good
if (true) {
  console.log('winning');
}

// bad
if (true)
{
  console.log('losing');
}
```

Also, notice the use of whitespace before and after the condition statement.

## Always use braces for conditionals and loops

```js
// good
if (err) {
  return cb(err);
}

// bad
if (err) cb(err);

// bad
if (err)
  return cb(err);
```

## Declare one variable per line, wherever it makes the most sense

This makes it easier to re-order the lines. However, ignore
[Crockford][crockfordconvention] when it comes to declaring variables deeper
inside a function, just put the declarations wherever they make sense.

```js
// good
const keys = ['foo', 'bar'];
const values = [23, 42];

// bad
const keys = ['foo', 'bar'],
      values = [23, 42];
```

[crockfordconvention]: http://javascript.crockford.com/code.html

## Use lowerCamelCase for variables, properties and function names

Variables, properties and function names should use `lowerCamelCase`.  They
should also be descriptive. Single character variables and uncommon
abbreviations should generally be avoided.

```js
// good
const adminUser = getAdmin();

// bad
const admin_user = getAdmin();
```

## Use UpperCamelCase for class names (constructors)

Class names should be capitalized using `UpperCamelCase`.

```js
// good
class BankAccount {}

// bad
class bank_account {}
class bankAccount {}
```

## Magic numbers/strings

These are numbers (or other values) simply used in line in your code. *Do not
use these*, give them a variable name so they can be understood and changed
easily.

```js
// good
const minWidth = 300;

if (width < minWidth) {
  ...
}

// bad
if (width < 300) {
  ...
}
```

## Object properties and functions

Use object method shorthand syntax for functions on objects:

```js
// good
const foo = {
  bar() {
    ...
  }
};

// bad
const foo = {
  bar: function () {
    ...
  }
};
```

Use property value shorthand syntax for properties that share a name with a
variable. And put them at the beginning:

```js
const bar = true;

// good
const foo = {
  bar
};

// bad
const foo = {
  bar: bar
};

// also bad (bar should be first)
const foo = {
  baz: false,
  bar
};
```

## Modules

Module dependencies should be written using native ES2015 syntax wherever
possible (which is almost everywhere):

```js
// good
import { mapValues } from 'lodash';
export default mapValues;

// bad
const _ = require('lodash');
module.exports = _.mapValues;

// worse
define(['lodash'], function (_) {
  ...
});
```

In those extremely rare cases where you're writing server-side JavaScript in a
file that does not pass run through webpack, then use CommonJS modules.

In those even rarer cases where you're writing client-side code that does not
run through webpack, then do not use a module loader at all.

## Import only top-level modules

The files inside a module are implementation details of that module. They
should never be imported directly. Instead, you must only import the top-level
API that's exported by the module itself.

Without a clear mechanism in place in JS to encapsulate protected code, we make
a broad assumption that anything beyond the root of a module is an
implementation detail of that module.

On the other hand, a module should be able to import parent and sibling
modules.

```js
// good
import foo from 'foo';
import child from './child';
import parent from '../';
import ancestor from '../../../';
import sibling from '../foo';

// bad
import inFoo from 'foo/child';
import inSibling from '../foo/child';
```

## Global definitions

Don't do this. Everything should be wrapped in a module that can be depended on
by other modules. Even things as simple as a single value should be a module.

## Function definitions

Use function declarations over function expressions, so that their names will
show up in stack traces, making errors easier to debug.

Also, keep function definitions above other code instead of relying on function
hoisting.

```js
// good
function myFunc() {
  ...
}

// bad
const myFunc = function () {
  ...
};
```

## Arrow functions

If you must use a function expression, then use an arrow function:

```js
// good
[1, 2, 3].map((n) => {
  const m = doSomething(n);
  return m - n;
});

// bad
[1, 2, 3].map(function (n) {
  const m = doSomething(n);
  return m - n;
});
```

If your function body does not include braces and only accepts one argument,
then omit the argument paranthesis:

```js
// good
[1, 2, 3].map(n => n + 1);

// bad
[1, 2, 3].map((n) => n + 1);

// bad
[1, 2, 3].map(n => {
  return n + 1;
});
```

If your arrow function is only returning an object literal, then wrap the
object in paranthesis rather than using an explicit return:

```js
// good
() => ({
  foo: 'bar'
})

// bad
() => {
  return {
    foo: 'bar'
  };
}
```

## Object / Array creation

Use trailing commas and put *short* declarations on a single line. Only quote
keys when your interpreter complains:

```js
// good
const a = ['hello', 'world'];
const b = {
  good: 'code',
  'is generally': 'pretty'
};

// bad
const a = [
  'hello', 'world'
];
const b = {'good': 'code'
        , is generally: 'pretty'
        };
```

## Object / Array iterations, transformations and operations

Use native methods to iterate and transform arrays and objects where possible.
Avoid `for` and `while` loops as they introduce the possibility of infinite
loops and break out of our preferred convention of declarative programming.

Use descriptive variable names in the closures.

Use a utility library as needed and where it will make code more
comprehensible.

```js
// best
const userNames = users.map(user => user.name);

// ok
import { pluck } from 'lodash';
const userNames = pluck(users, 'name');

// bad
const userNames = [];
for (let i = 0; i < users.length; i++) {
  userNames.push(users[i].name);
}
```

## Use the spread operator (...) for copying arrays

This helps with expressiveness and readability.

```js
const arr = [1, 2, 3];

// good
const arrCopy = [...arr];

// bad
const arrCopy = arr.slice();
```

## Use the === operator

Programming is not about remembering [stupid rules][comparisonoperators]. Use
the triple equality operator as it will work just as expected.

```js
const a = 0;

// good
if (a !== '') {
  console.log('winning');
}

// bad
if (a == '') {
  console.log('losing');
}
```

[comparisonoperators]: https://developer.mozilla.org/en/JavaScript/Reference/Operators/Comparison_Operators

## Only use ternary operators for small, simple code

And *never* use multiple ternaries together, because they make it more
difficult to reason about how different values flow through the conditions
involved. Instead, structure the logic for maximum readability.

```js
// good, a situation where only 1 ternary is needed
const foo = (a === b) ? 1 : 2;

// bad
const foo = (a === b) ? 1 : (a === c) ? 2 : 3;
```

## Do not extend built-in prototypes

Do not extend the prototype of native JavaScript objects. Your future self will
be forever grateful.

```js
// bad
Array.prototype.empty = function () {
  return !this.length;
}
```

## Use descriptive conditions

Any non-trivial conditions should be converted to functions or assigned to
descriptively named variables. By breaking up logic into smaller,
self-contained blocks, it becomes easier to reason about the higher-level
logic. Additionally, these blocks become good candidates for extraction into
their own modules, with unit-tests.

```js
// best
function isShape(thing) {
  return thing instanceof Shape;
}
function notSquare(thing) {
  return !(thing instanceof Square);
}
if (isShape(thing) && notSquare(thing)) {
  ...
}

// good
const isShape = thing instanceof Shape;
const notSquare = !(thing instanceof Square);
if (isShape && notSquare) {
  ...
}

// bad
if (thing instanceof Shape && !(thing instanceof Square)) {
  ...
}
```

## Name regular expressions

```js
// good
const validPassword = /^(?=.*\d).{4,}$/;

if (password.length >= 4 && validPassword.test(password)) {
  console.log('password is valid');
}

// bad
if (password.length >= 4 && /^(?=.*\d).{4,}$/.test(password)) {
  console.log('losing');
}
```

## Write small functions

Keep your functions short. A good function fits on a slide that the people in
the last row of a big room can comfortably read. So don't count on them having
perfect vision and limit yourself to ~15 lines of code per function.

## Use "rest" syntax rather than built-in `arguments`

For expressiveness sake, and so you can be mix dynamic and explicit arguments.

```js
// good
function something(foo, ...args) {
  ...
}

// bad
function something(foo) {
  const args = Array.from(arguments).slice(1);
  ...
}
```

## Default argument syntax

Always use the default argument syntax for optional arguments.

```js
// good
function foo(options = {}) {
  ...
}

// bad
function foo(options) {
  if (typeof options === 'undefined') {
    options = {};
  }
  ...
}
```

And put your optional arguments at the end.

```js
// good
function foo(bar, options = {}) {
  ...
}

// bad
function foo(options = {}, bar) {
  ...
}
```

## Return/throw early from functions

To avoid deep nesting of if-statements, always return a function's value as early
as possible. And where possible, do any assertions first:

```js
// good
function doStuff(val) {
  if (val > 100) {
    throw new Error('Too big');
  }

  if (val < 0) {
    return false;
  }

  // ... stuff
}

// bad
function doStuff(val) {
  if (val >= 0) {
    if (val < 100) {
      // ... stuff
    } else {
      throw new Error('Too big');
    }
  } else {
    return false;
  }
}
```

## Chaining operations

When using a chaining syntax, indent the subsequent chained operations.

Also, if the chain is long, each method should be on a new line.

```js
// good
$http.get('/info')
  .then(({ data }) => this.transfromInfo(data))
  .then((transformed) => $http.post('/new-info', transformed))
  .then(({ data }) => console.log(data));

// bad
$http.get('/info')
.then(({ data }) => this.transfromInfo(data))
.then((transformed) => $http.post('/new-info', transformed))
.then(({ data }) => console.log(data));
```

## Avoid mutability and state

Wherever possible, do not rely on mutable state. This means you should not
reassign variables, modify object properties, or push values to arrays.
Instead, create new variables, and shallow copies of objects and arrays:

```js
// good
function addBar(foos, foo) {
  const newFoo = {...foo, name: 'bar'};
  return [...foos, newFoo];
}

// bad
function addBar(foos, foo) {
  foo.name = 'bar';
  foos.push(foo);
}
```

## Use thunks to create closures, where possible

For trivial examples (like the one that follows), thunks will seem like
overkill, but they encourage isolating the implementation details of a closure
from the business logic of the calling code.

```js
// good
function connectHandler(client, callback) {
  return () => client.connect(callback);
}
setTimeout(connectHandler(client, afterConnect), 1000);

// not as good
setTimeout(() => {
  client.connect(afterConnect);
}, 1000);

// bad
setTimeout(() => {
  client.connect(() => {
    ...
  });
}, 1000);
```

## Use slashes for comments

Use slashes for both single line and multi line comments. Try to write
comments that explain higher level mechanisms or clarify difficult
segments of your code. *Don't use comments to restate trivial things*.

*Exception:* Comment blocks describing a function and its arguments
(docblock) should start with `/**`, contain a single `*` at the beginning of
each line, and end with `*/`.


```js
// good

// 'ID_SOMETHING=VALUE' -> ['ID_SOMETHING=VALUE', 'SOMETHING', 'VALUE']
const matches = item.match(/ID_([^\n]+)=([^\n]+)/));

/**
 * Fetches a user from...
 * @param  {string} id - id of the user
 * @return {Promise}
 */
function loadUser(id) {
  // This function has a nasty side effect where a failure to increment a
  // redis counter used for statistics will cause an exception. This needs
  // to be fixed in a later iteration.

  ...
}

const isSessionValid = (session.expires < Date.now());
if (isSessionValid) {
  ...
}

// bad

// Execute a regex
const matches = item.match(/ID_([^\n]+)=([^\n]+)/));

// Usage: loadUser(5, function() { ... })
function loadUser(id, cb) {
  // ...
}

// Check if the session is valid
const isSessionValid = (session.expires < Date.now());
// If the session is valid
if (isSessionValid) {
  ...
}
```

## Do not comment out code

We use a version management system. If a line of code is no longer needed,
remove it, don't simply comment it out.

## Classes/Constructors and Inheritance

If you must use a constructor, then use the native `class` syntax. *Never* use
third party "class" utilities, and never mutate prototypes.

```js
// best (no local state at all)
function addUser(users, user) {
  return [...users, user];
}
const users = addUser([], { name: 'foo' });

// good
class Users {
  add(user) {
    ...
  }
}
const users = new Users();
users.add({ name: 'foo' });

// bad
function Users() {
  ...
}
Users.prototype.add = function () {
  ...
};
const users = new Users();
users.add({ name: 'foo' });
```

## Do not alias `this`

Try not to rely on `this` at all, but if you must, then use arrow functions
instead of aliasing it.

```js
// good
class Users {
  add(user) {
    return createUser(user)
      .then(response => this.users.push(response.user));
  }
}

// bad
class Users {
  add(user) {
    const self = this;
    return createUser(user).then(function (response) {
      self.users.push(response.user);
    });
  }
}
```

## Getters and Setters

Feel free to use getters that are free from [side effects][sideeffect], like
providing a length property for a collection class.

Do not use setters, they cause more problems than they can solve.

[sideeffect]: http://en.wikipedia.org/wiki/Side_effect_(computer_science)
