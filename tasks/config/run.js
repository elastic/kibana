module.exports = function (grunt) {
  return {
    devServer: {
      options: {
        wait: false,
        ready: /Server running/,
        quiet: false,
        failOnError: false
      },
      cmd: './bin/kibana',
      args: ['--logging.json=false']
    }
  };
};
