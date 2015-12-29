import { isAdded, getFilename } from './utils/files_to_commit';

export default function registerCheckAddedFilenames(grunt) {
  grunt.registerTask('checkAddedFilenames', function () {
    grunt.task.requires('collectFilesToCommit');

    const invalid = grunt.config
    .get('filesToCommit')
    .filter(isAdded)
    .map(getFilename)
    .filter(name => name.match(/[A-Z \-]/))
    .reduce((all, name) => `${all}  ${name}\n`, '');

    if (invalid) {
      grunt.fail.fatal(`Filenames must use snake_case.\n${invalid}`);
    }
  });
}
