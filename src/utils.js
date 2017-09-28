const ora = require('ora');

function withSpinner(text, promise) {
  const spinner = ora(text).start();
  return promise
    .then(res => {
      spinner.succeed();
      return res;
    })
    .catch(e => {
      spinner.fail();
      throw e;
    });
}

module.exports = { withSpinner };
