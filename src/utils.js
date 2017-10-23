const ora = require('ora');
const promisify = require('es6-promisify');
const process = require('child_process');
const fs = require('fs');

function withSpinner(promise, text, errorText) {
  const spinner = ora(text).start();
  return promise
    .then(res => {
      spinner.succeed();
      return res;
    })
    .catch(e => {
      if (errorText) {
        spinner.text = errorText;
      }
      spinner.fail();
      throw e;
    });
}

module.exports = {
  withSpinner,
  exec: promisify(process.exec),
  writeFile: promisify(fs.writeFile),
  readFile: promisify(fs.readFile)
};
