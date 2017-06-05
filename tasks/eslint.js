import { CLIEngine } from 'eslint';

const OPTION_DEFAULTS = {
  paths: null,
  cache: null,
  fix: false
};

export default grunt => {
  grunt.registerMultiTask('eslint', function () {
    const options = this.options(OPTION_DEFAULTS);

    if (!options.paths) {
      grunt.fatal(new Error('No eslint.options.paths specified'));
      return;
    }

    const cli = new CLIEngine({
      cache: options.cache,
      fix: options.fix,
      cwd: grunt.config.get('root'),
    });

    // report includes an entire list of files checked and the
    // fixes, errors, and warning for each.
    const report = cli.executeOnFiles(options.paths);

    // output fixes to disk
    if (options.fix) {
      CLIEngine.outputFixes(report);
    }

    // log the formatted linting report
    const formatter = cli.getFormatter();

    const errTypes = [];
    if (report.errorCount > 0) errTypes.push('errors');
    if (report.warningCount > 0) errTypes.push('warning');
    if (!errTypes.length) return;

    grunt.log.write(formatter(report.results));
    grunt.fatal(`eslint ${errTypes.join(' & ')}`);
  });
};
