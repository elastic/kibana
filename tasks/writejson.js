const read = require('fs').readFileSync;
const write = require('fs').writeFileSync;
const resolve = require('path').resolve;
const parse = require('js-yaml').safeLoad;

const from = resolve(__dirname, '../.eslintrc.yaml');
const to = resolve(__dirname, '../.eslintrc.json');

const config = parse(read(from, 'utf8'));

write(to, JSON.stringify(config, null, 2), 'utf8');
