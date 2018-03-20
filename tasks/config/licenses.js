module.exports = function () {
  return {
    options: {
      licenses: [
        '(BSD-2-Clause OR MIT OR Apache-2.0)',
        '(BSD-2-Clause OR MIT)',
        '(GPL-2.0 OR MIT)',
        '(MIT AND CC-BY-3.0)',
        '(MIT AND Zlib)',
        '(MIT OR Apache-2.0)',
        '(WTFPL OR MIT)',
        'AFLv2.1',
        'Apache 2.0',
        'Apache License, v2.0',
        'Apache',
        'Apache*',
        'Apache, Version 2.0',
        'Apache-2.0',
        'BSD 3-Clause',
        'BSD New',
        'BSD',
        'BSD*',
        'BSD-2-Clause',
        'BSD-3-Clause AND MIT',
        'BSD-3-Clause OR MIT',
        'BSD-3-Clause',
        'BSD-like',
        'CC0-1.0',
        'CC-BY',
        'CC-BY-3.0',
        'CC-BY-4.0',
        'ISC',
        'MIT OR GPL-2.0',
        'MIT',
        'MIT*',
        'MIT/X11',
        'new BSD, and MIT',
        'OFL-1.1 AND MIT',
        'Public Domain',
        'Unlicense',
        'WTFPL OR ISC',
        'WTFPL',
      ],
      overrides: {
        // TODO can be removed once we upgrade past elasticsearch-browser@14.0.0
        'elasticsearch-browser@13.0.1': ['Apache-2.0'],
        // TODO can be removed once we upgrade past colors.js@1.0.0
        'colors@0.5.1': ['MIT'],
        // TODO can be removed once we upgrade past map-stream@0.5.0
        'map-stream@0.1.0': ['MIT'],
        'uglify-js@2.2.5': ['BSD'],
        'png-js@0.1.1': ['MIT'],
      }
    }
  };
};
