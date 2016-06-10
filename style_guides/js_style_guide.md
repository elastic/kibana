
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

## Use single quotes

Use single quotes, unless you are writing JSON.

*Right:*

```js
var foo = 'bar';
```

*Wrong:*

```js
var foo = "bar";
```

## Opening braces go on the same line

Your opening braces go on the same line as the statement.

*Right:*

```js
if (true) {
  console.log('winning');
}
```

*Wrong:*

```js
if (true)
{
  console.log('losing');
}
```

Also, notice the use of whitespace before and after the condition statement.

## Always use braces for multi-line code

*Right:*

```js
if (err) {
  return cb(err);
}
```

*Wrong:*

```js
if (err)
  return cb(err);
```

## Prefer multi-line conditionals

But single-line conditionals are allowed for short lines

*Preferred:*

```js
if (err) {
  return cb(err);
}
```

*Allowed:*

```js
if (err) return cb(err);
```

## Declare one variable per var statement

Declare one variable per var statement, it makes it easier to re-order the
lines. However, ignore [Crockford][crockfordconvention] when it comes to
declaring variables deeper inside a function, just put the declarations wherever
they make sense.

*Right:*

```js
var keys = ['foo', 'bar'];
var values = [23, 42];

var object = {};
while (keys.length) {
  var key = keys.pop();
  object[key] = values.pop();
}
```

*Wrong:*

```js
var keys = ['foo', 'bar'],
    values = [23, 42],
    object = {},
    key;

while (keys.length) {
  key = keys.pop();
  object[key] = values.pop();
}
```

[crockfordconvention]: http://javascript.crockford.com/code.html

## Use lowerCamelCase for variables, properties and function names

Variables, properties and function names should use `lowerCamelCase`.  They
should also be descriptive. Single character variables and uncommon
abbreviations should generally be avoided.

*Right:*

```js
var adminUser = db.query('SELECT * FROM users ...');
```

*Wrong:*

```js
var admin_user = db.query('SELECT * FROM users ...');
```

## Use UpperCamelCase for class names

Class names should be capitalized using `UpperCamelCase`.

*Right:*

```js
function BankAccount() {
}
```

*Wrong:*

```js
function bank_Account() {
}
```

## Use UPPERCASE for Constants

Constants should be declared as regular variables or static class properties,
using all uppercase letters.

Node.js / V8 actually supports mozilla's [const][const] extension, but
unfortunately that cannot be applied to class members, nor is it part of any
ECMA standard.

*Right:*

```js
var SECOND = 1 * 1000;

function File() {
}
File.FULL_PERMISSIONS = 0777;
```

*Wrong:*

```js
const SECOND = 1 * 1000;

function File() {
}
File.fullPermissions = 0777;
```

[const]: https://developer.mozilla.org/en/JavaScript/Reference/Statements/const

## Magic numbers

These are numbers (or other values) simply used in line in your code. **Do not use these**, give them a variable name so they can be understood and changed easily.

*Right:*

```js
var minWidth = 300;

if (width < minWidth) {
  ...
}
```

*Wrong:*

```js
if (width < 300) {
  ...
}
```

## Global definitions

Don't do this. Everything should be wrapped in a module that can be depended on by other modules. Even things as simple as a single value should be a module.

## Function definitions

Prefer the use of function declarations over function expressions. Function expressions are allowed, but should usually be avoided.

Also, keep function definitions above other code instead of relying on function hoisting.

*Preferred:*

```js
function myFunc() {
  ...
}
```

*Allowed:*

```js
var myFunc = function () {
  ...
};
```

## Object / Array creation

Use trailing commas and put *short* declarations on a single line. Only quote
keys when your interpreter complains:

*Right:*

```js
var a = ['hello', 'world'];
var b = {
  good: 'code',
  'is generally': 'pretty'
};
```

*Wrong:*

```js
var a = [
  'hello', 'world'
];
var b = {"good": 'code'
        , is generally: 'pretty'
        };
```

## Object / Array iterations, transformations and operations

Use native ES5 methods to iterate and transform arrays and objects where possible. Do not use `for` and `while` loops.

Use descriptive variable names in the closures.

Use a utility library as needed and where it will make code more comprehensible.

*Right:*

```js
var userNames = users.map(function (user) {
  return user.name;
});

// examples where lodash makes the code more readable
var userNames = _.pluck(users, 'name');
```

*Wrong:*

```js
var userNames = [];
for (var i = 0; i < users.length; i++) {
  userNames.push(users[i].name);
}
```

## Use the === operator

Programming is not about remembering [stupid rules][comparisonoperators]. Use
the triple equality operator as it will work just as expected.

*Right:*

```js
var a = 0;
if (a !== '') {
  console.log('winning');
}

```

*Wrong:*

```js
var a = 0;
if (a == '') {
  console.log('losing');
}
```

[comparisonoperators]: https://developer.mozilla.org/en/JavaScript/Reference/Operators/Comparison_Operators

## Only use ternary operators for small, simple code

And **never** use multiple ternaries together

*Right:*

```js
var foo = (a === b) ? 1 : 2;
```

*Wrong:*

```js
var foo = (a === b) ? 1 : (a === c) ? 2 : 3;
```

## Do not extend built-in prototypes

Do not extend the prototype of native JavaScript objects. Your future self will
be forever grateful.

*Right:*

```js
var a = [];
if (!a.length) {
  console.log('winning');
}
```

*Wrong:*

```js
Array.prototype.empty = function() {
  return !this.length;
}

var a = [];
if (a.empty()) {
  console.log('losing');
}
```

## Use descriptive conditions

Any non-trivial conditions should be assigned to a descriptively named variables, broken into
several names variables, or converted to be a function:

*Right:*

```js
var thing = ...;
var isShape = thing instanceof Shape;
var notSquare = !(thing instanceof Square);
var largerThan10 = isShape && thing.size > 10;

if (isShape && notSquare && largerThan10) {
  console.log('some big polygon');
}
```

*Wrong:*

```js
if (
  thing instanceof Shape
  && !(thing instanceof Square)
  && thing.size > 10
) {
  console.log('bigger than ten?? Woah!');
}
```

## Name regular expressions

*Right:*

```js
var validPasswordRE = /^(?=.*\d).{4,}$/;

if (password.length >= 4 && validPasswordRE.test(password)) {
  console.log('password is valid');
}
```

*Wrong:*

```js
if (password.length >= 4 && /^(?=.*\d).{4,}$/.test(password)) {
  console.log('losing');
}
```

## Write small functions

Keep your functions short. A good function fits on a slide that the people in
the last row of a big room can comfortably read. So don't count on them having
perfect vision and limit yourself to ~15 lines of code per function.

## Return early from functions

To avoid deep nesting of if-statements, always return a function's value as early
as possible.

*Right:*

```js
function isPercentage(val) {
  if (val < 0) return false;
  if (val > 100) return false;

  return true;
}
```

*Wrong:*

```js
function isPercentage(val) {
  if (val >= 0) {
    if (val < 100) {
      return true;
    } else {
      return false;
    }
  } else {
    return false;
  }
}
```

Or for this particular example it may also be fine to shorten things even
further:

```js
function isPercentage(val) {
  var isInRange = (val >= 0 && val <= 100);
  return isInRange;
}
```

## Chaining operations

When using a chaining syntax (jquery or promises, for example), do not indent the subsequent chained operations, unless there is a logical grouping in them.

Also, if the chain is long, each method should be on a new line.

*Right:*

```js
$('.someClass')
.addClass('another-class')
.append(someElement)
```

```js
d3.selectAll('g.bar')
.enter()
  .append('thing')
  .data(anything)
  .exit()
.each(function() ... )
```

```js
$http.get('/info')
.then(({ data }) => this.transfromInfo(data))
.then((transformed) => $http.post('/new-info', transformed))
.then(({ data }) => console.log(data));
```

*Wrong:*

```js
$('.someClass')
  .addClass('another-class')
  .append(someElement)
```

```js
d3.selectAll('g.bar')
.enter().append('thing').data(anything).exit()
.each(function() ... )
```

```js
$http.get('/info')
  .then(({ data }) => this.transfromInfo(data))
  .then((transformed) => $http.post('/new-info', transformed))
  .then(({ data }) => console.log(data));
```

## Name your closures

Feel free to give your closures a descriptive name. It shows that you care about them, and
will produce better stack traces, heap and cpu profiles.

*Right:*

```js
req.on('end', function onEnd() {
  console.log('winning');
});
```

*Wrong:*

```js
req.on('end', function() {
  console.log('losing');
});
```

## No nested closures

Use closures, but don't nest them. Otherwise your code will become a mess.

*Right:*

```js
setTimeout(function() {
  client.connect(afterConnect);
}, 1000);

function afterConnect() {
  console.log('winning');
}
```

*Wrong:*

```js
setTimeout(function() {
  client.connect(function() {
    console.log('losing');
  });
}, 1000);
```

## Use slashes for comments

Use slashes for both single line and multi line comments. Try to write
comments that explain higher level mechanisms or clarify difficult
segments of your code. **Don't use comments to restate trivial things**.

***Exception:*** Comment blocks describing a function and its arguments (docblock) should start with `/**`, contain a single `*` at the beginning of each line, and end with `*/`.

*Right:*

```js
// 'ID_SOMETHING=VALUE' -> ['ID_SOMETHING=VALUE', 'SOMETHING', 'VALUE']
var matches = item.match(/ID_([^\n]+)=([^\n]+)/));

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

var isSessionValid = (session.expires < Date.now());
if (isSessionValid) {
  ...
}
```

*Wrong:*

```js
// Execute a regex
var matches = item.match(/ID_([^\n]+)=([^\n]+)/));

// Usage: loadUser(5, function() { ... })
function loadUser(id, cb) {
  // ...
}

// Check if the session is valid
var isSessionValid = (session.expires < Date.now());
// If the session is valid
if (isSessionValid) {
  // ...
}
```

## Do not comment out code

We use a version management system. If a line of code is no longer needed, remove it, don't simply comment it out.

## Classes/Constructors and Inheritance

While JavaScript it is not always considered an object-oriented language, it does have the building blocks for writing object oriented code. Of course, as with all things JavaScript, there are many ways this can be accomplished. Generally, we try to err on the side of readability.

### Capitalized function definition as Constructors

When Defining a Class/Constructor, use the function definition syntax.

*Right:*
```js
function ClassName() {

}
```

*Wrong:*
```js
var ClassName = function () {};
```

### Inheritance should be done with a utility

While you can do it with pure JS, a utility will remove a lot of boilerplate, and be more readable and functional.

*Right:*

```js
// uses a lodash inherits mixin
// inheritance is defined first - it's easier to read and the function will be hoisted
_.class(Square).inherits(Shape);

function Square(width, height) {
  Square.Super.call(this);
}
```

*Wrong:*

```js
function Square(width, height) {
  this.width = width;
  this.height = height;
}

Square.prototype = Object.create(Shape);
```

### Keep Constructors Small

It is often the case that there are properties that can't be defined on the prototype, or work that needs to be done to completely create an object (like call its Super class). This is all that should be done within constructors.

Try to follow the [Write small functions](#write-small-functions) rule here too.

### Use the prototype

If a method/property *can* go on the prototype, it probably should.

```js
function Square() {
  ...
}

/**
 * method does stuff
 * @return {undefined}
 */
Square.prototype.method = function () {
  ...
}
```

### Handling scope and aliasing `this`

When creating a prototyped class, each method should almost always start with:

`var self = this;`

With the exception of very short methods (roughly 3 lines or less), `self` should always be used in place of `this`.

Avoid the use of `bind`

*Right:*

```js
Square.prototype.doFancyThings = function () {
  var self = this;

  somePromiseUtil()
  .then(function (result) {
    self.prop = result.prop;
  });
}
```

*Wrong:*

```js
Square.prototype.doFancyThings = function () {
  somePromiseUtil()
  .then(function (result) {
    this.prop = result.prop;
  }).bind(this);
}
```

*Allowed:*

```js
Square.prototype.area = function () {
  return this.width * this.height;
}
```

## Object.freeze, Object.preventExtensions, Object.seal, with, eval

Crazy shit that you will probably never need. Stay away from it.

## Getters and Setters

Feel free to use getters that are free from [side effects][sideeffect], like
providing a length property for a collection class.

Do not use setters, they cause more problems for people who try to use your
software than they can solve.

[sideeffect]: http://en.wikipedia.org/wiki/Side_effect_(computer_science)
