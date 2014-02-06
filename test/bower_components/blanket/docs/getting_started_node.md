# Getting Started Guide (nodejs version)

This guide details using Blanket.js with a simple mocha test setup in NodeJS.

To begin you will need:  
* an existing mocha tests (including the mocha module, `npm install mocha -g`)
* source files

1. Install Blanket: `npm install blanket`

2. Add the following to your package.json file:

    "scripts": {
      "blanket": {
        "pattern": <string to match to source file paths>
      }
    }
    
    If you omit this from your package.json, Blanket will default to "src".

3. Add Blanket as a require to your mocha command:

```mocha --require blanket```

4. Use the built-in html-cov reporter in mocha to display coverage results:

```mocha --require blanket -R html-cov > coverage.html```

