module.exports = function (grunt) {
  const config = {
    peg: {
      legacyKuery: {
        src: 'src/ui/public/kuery/ast/legacy_kuery.peg',
        dest: 'src/ui/public/kuery/ast/legacy_kuery.js'
      },
      kuery: {
        src: 'src/ui/public/kuery/ast/kuery.peg',
        dest: 'src/ui/public/kuery/ast/kuery.js',
        options: {
          allowedStartRules: ['start', 'Literal', 'WildcardString']
        }
      }
    },
    watch: {
      peg: {
        files: ['src/ui/public/kuery/ast/*.peg'],
        tasks: ['peg']
      }
    }
  };
  grunt.config.merge(config);
};
