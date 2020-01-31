# Accessibility (A11Y) Guide

[EUI's accessibility guidelines](https://elastic.github.io/eui/#/guidelines/accessibility) should be your first stop for all things.

## Automated accessibility testing

To run the tests locally:

1. In one terminal window run `node scripts/functional_tests_server --config test/accessibility/config.ts`
2. In another terminal window run `node scripts/functional_test_runner.js --config test/accessibility/config.ts`

To run the x-pack tests, swap the config file out for `x-pack/test/accessibility/config.ts`.

After the server is up, you can go to this instance of Kibana at `localhost:5020`.

The testing is done using [axe](https://github.com/dequelabs/axe-core). The same thing that runs in CI,
can be run locally using their browser plugins:

- [Chrome](https://chrome.google.com/webstore/detail/axe-web-accessibility-tes/lhdoppojpmngadmnindnejefpokejbdd?hl=en-US)
- [Firefox](https://addons.mozilla.org/en-US/firefox/addon/axe-devtools/)

## How to generate ids?

When labeling elements (and for some other accessibility tasks) you will often need
ids. Ids must be unique within the page i.e. no duplicate ids in the rendered DOM
at any time.

Since we have some components that are used multiple times on the page, you must
make sure every instance of that component has a unique `id`. To make the generation
of those `id`s easier, you can use the `htmlIdGenerator` service in the `@elastic/eui`.

A react component could use it as follows:

```jsx
import { htmlIdGenerator } from '@elastic/eui';

render() {
  // Create a new generator that will create ids deterministic
  const htmlId = htmlIdGenerator();
  return (<div>
    <label htmlFor={htmlId('agg')}>Aggregation</label>
    <input id={htmlId('agg')}/>
  </div>);
}
```

Each id generator you create by calling `htmlIdGenerator()` will generate unique but
deterministic ids. As you can see in the above example, that single generator
created the same id in the label's `htmlFor` as well as the input's `id`.

A single generator instance will create the same id when passed the same argument
to the function multiple times. But two different generators will produce two different
ids for the same argument to the function, as you can see in the following example:

```js
const generatorOne = htmlIdGenerator();
const generatorTwo = htmlIdGenerator();

// Those statements are always true:
// Same generator
generatorOne('foo') === generatorOne('foo');
generatorOne('foo') !== generatorOne('bar');

// Different generator
generatorOne('foo') !== generatorTwo('foo');
```

This allows multiple instances of a single react component to now have different ids.
If you include the above react component multiple times in the same page,
each component instance will have a unique id, because each render method will use a different
id generator.

You can use this service of course also outside of react.
