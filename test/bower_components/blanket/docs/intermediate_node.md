# Intermediate Guide (nodejs version)

This guide details using Blanket.js with a mocha testrunner, and the travis-cov reporter in NodeJS.

It is assumed you have already read the Getting Started guide.

To begin you will need:  
* an existing mocha tests/test runner (including the mocha module, `npm install mocha -g`)
* source files

1. Install Blanket: `npm install blanket`

2. Add the following to top of your test runner file:

    ```  
    var blanket = require("blanket")({  
       /* options are passed as an argument object to the require statement */  
       "pattern": "/source/"  
       });  
    ```
 
    ... where `/source/` matches partially or fully the directory where the source files to be instrumented are stored.  
    You can also provide an array of regular expression.  

3. Omitting the object argument will default to "src".  Additionally, any value provided there will override values set in the package.json file.

4. Since we've explicit referenced blanket we don't need to require it in the mocha command.

5. Install the travis-cov reporter: `npm install travis-cov`

6. We will set the coverage threshold in the package.json file.  The following will set the coverage threshold at 70%.  Any tests falling below 70% will fail, and (when run on travis-ci) will cause the build to fail:

    ` "scripts": {
    "travis-cov": {
      "threshold": 70
    }
}`

7. Use the travis-cov reporter to display coverage percentage:

```mocha <path to test runner> -R travis-cov```

