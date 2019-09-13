const _ = require('lodash');

module.exports = function (grunt) {


  grunt.registerTask('test:ui:runner', [
    'clean:screenshots',
    'run:devChromeDriver',
    'intern:dev'
  ]);

  grunt.registerTask('test:ui:runvm', [
    'clean:screenshots',
    'intern:dev'
  ]);
  
  grunt.registerTask('test:ui:ie', [
    'clean:screenshots',
    'intern:dev'
  ]);

  grunt.registerTask('test', subTask => {
    if (subTask) grunt.fail.fatal(`invalid task "test:${subTask}"`);

    grunt.task.run(_.compact([
      !grunt.option('quick') && 'eslint:source',
      'licenses',
      'test:quick'
    ]));
  });

};
