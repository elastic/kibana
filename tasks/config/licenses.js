module.exports = function (grunt) {
  return {
    options: {
      licenses: [
        'MIT',
        'MIT*',
        'MIT License',
        'MIT/X11',
        'new BSD, and MIT',
        'BSD',
        'BSD*',
        'BSD New',
        'BSD-like',
        'BSD-2-Clause',
        'BSD-3-Clause',
        'CC-BY',
        'Apache',
        'Apache*',
        'Apache v2',
        'Apache 2.0',
        'Apache2',
        'Apache-2.0',
        'Apache, Version 2.0',
        'Apache License, v2.0',
        'ISC',
        'WTFPL',
        'Public-Domain',
        'UNLICENSE'
      ],
      overrides: {
        'amdefine@1.0.0': ['BSD-3-Clause', 'MIT'],
        'angular-bootstrap@0.10.0': ['MIT'],
        'angular-ui-ace@0.2.3': ['MIT'],
        'assert-plus@0.1.5': ['MIT'],
        'color-name@1.0.0': ['UNLICENSE'],
        'commander@2.2.0': ['MIT'],
        'css-color-names@0.0.1': ['MIT'],
        'css-parse@1.0.4': ['MIT'],
        'css-stringify@1.0.5': ['MIT'],
        'css@1.0.8': ['MIT'],
        'cycle@1.0.3': ['Public-Domain'],
        'FileSaver@1.1.0': ['MIT'],
        'flatten@0.0.1': ['MIT'],
        'indexof@0.0.1': ['MIT'],
        'inherits@1.0.0': ['ISC'],
        'jsonpointer@1.1.0': ['MIT'],
        'leaflet@0.7.2': ['BSD-2-Clause'],
        'Nonsense@0.1.2': ['Public-Domain'],
        'pkginfo@0.2.3': ['MIT'],
        'uglify-js@2.2.5': ['BSD'],
      }
    }
  };
};
