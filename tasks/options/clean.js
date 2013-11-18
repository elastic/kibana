module.exports = function (config) {
  return {
    setup: [ '<%= kibanaCheckoutDir %>', '<%= buildDir %>' ],
    build: [ '<%= buildDir %>' ],
    package: ['<%= packageDir %>']
  };
};