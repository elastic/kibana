module.exports = {
  legacyKuery: {
    src: 'src/ui/public/kuery/ast/legacy_kuery.peg',
    dest: 'src/ui/public/kuery/ast/legacy_kuery.js'
  },
  kuery: {
    src: 'src/ui/public/kuery/ast/kuery.peg',
    dest: 'src/ui/public/kuery/ast/kuery.js',
    options: {
      allowedStartRules: ['start', 'Literal']
    }
  }
};
