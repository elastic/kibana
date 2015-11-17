var path = require('path');

module.exports = function (grunt) {
  return {
    defaultFiles: '644',
    defaultDirectories: '755',
    executables: {
      src: ['bin/kibana', 'bin/kibana.bat'],
      options: {
        mode: '755'
      }
    }
  };
};
