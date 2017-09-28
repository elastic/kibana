const ora = require('ora');

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

module.exports = { withSpinner };
