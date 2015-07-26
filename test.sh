 FILES=$(glob-cli src/**/__tests__/**/*.js '!src/**/public/**' '!src/ui/**')
 mocha --bail --reporter spec  --timeout 10000 $FILES
