module.exports = function (config) {
  return {
    setup: [ '<%= kibanaCheckoutDir %>', '<%= buildDir %>' ],
    build: [ '<%= buildDir %>' ],
    build_tmp: [ '<%= buildTempDir %>' ],
    package: ['<%= packageDir %>']
  };
};