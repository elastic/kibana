export default function (grunt) {
  grunt.registerTask('checkStagedFilenames', function () {
    grunt.task.requires('collectStagedFiles');

    const invalid = grunt.config
    .get('stagedFiles')
    .filter(name => name.match(/[A-Z ]/))
    .reduce((all, name) => `${all}  ${name}\n`, '');

    if (invalid) {
      grunt.fail.fatal(`Filenames must use snake_case.\n${invalid}`);
    }
  });
}
