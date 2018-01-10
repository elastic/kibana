Kibana ships with a vendored version of Yarn, which is used to install
dependencies when preparing the production build of Kibana.

The currently vendored version of Yarn contains the bugfix in
https://github.com/yarnpkg/yarn/pull/5059, which handles optional dependencies.

To build a new Yarn bundle, check out that pull request and run:

```
yarn build-bundle
```

This will create the file `artifacts/yarn-1.3.2.js`, which can be renamed and
moved to this folder.
