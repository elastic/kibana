const ora = require('ora');
const promisify = require('es6-promisify');
const process = require('child_process');
const processExec = promisify(process.exec);

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

function exec(...args) {
  return processExec(...args);
}

module.exports = { withSpinner, exec };
