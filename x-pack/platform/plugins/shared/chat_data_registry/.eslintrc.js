require('@kbn/babel-register').install();

module.exports = {
  root: true,
  extends: ['@kbn/eslint-config', 'plugin:@elastic/eui/recommended'],
  rules: {
    '@kbn/eslint/require-license-header': 'off',
  },
};
