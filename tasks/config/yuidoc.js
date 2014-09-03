module.exports = function (grunt) {
  return {
    compile: {
      name: '<%= pkg.name %>',
      description: '<%= pkg.description %>',
      version: '<%= pkg.version %>',
      url: '<%= pkg.homepage %>',
      options: {
        linkNatives: true,
        paths: [
          'src/kibana/components'
        ],
        excludePaths: [
          'src/kibana/components/courier'
        ],
        outdir: 'docs',
        tabtospace: 2,
        markdown: {
          gfm: true
        }
      }
    }
  };
};