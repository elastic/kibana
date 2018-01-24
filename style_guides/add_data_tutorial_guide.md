# Add Data guide
`Add Data` in the Kibana Home application contains a collection of tutorials for setting up data flows in the Elastic stack.

Each tutorial contains 3 sets of instructions
1. `On Premise` Instructions for setting up a data flow when both Kibana and Elastic Search are running on premise
2. `On Premise Elastic Cloud` Instructions for setting up a data flow when Kibana is running on premise but
Elastic Search is running on cloud.
3. `Elastic Cloud` Instructions for setting up a data flow when both Kibana and Elastic Search are running on cloud.

## Creating a new tutorial
1. Create a new folder in the [tutorials directory](https://github.com/elastic/kibana/tree/master/src/core_plugins/kibana/server/tutorials).
2. In the new folder, create a file called `index.js` that exports a function.
The function must return a Javascript object that conforms to the [tutorial schema](https://github.com/elastic/kibana/blob/master/src/core_plugins/kibana/common/tutorials/tutorial_schema.js).
3. Register the tutorial in [register.js](https://github.com/elastic/kibana/blob/master/src/core_plugins/kibana/server/tutorials/register.js) by calling `server.registerTutorial(myFuncImportedFromIndexJs)`.
4. Add image assets to the [tutorial_resources directory](https://github.com/elastic/kibana/tree/master/src/core_plugins/kibana/public/home/tutorial_resources).
5. Create a PR and go through the review process to get the changes approved.

### Variables
String values can contain variables that get substituted when rendered. Variables are specified by `{}`.
For example: `{config.docs.version}` would get rendered as `6.2` when running the tutorial in Kibana 6.2.

[Provided variables](https://github.com/elastic/kibana/blob/master/src/core_plugins/kibana/public/home/components/tutorial/replace_template_strings.js#L23)

### Markdown
String values can contain limited markdown syntax.

[Enabled markdown grammers](https://github.com/elastic/kibana/blob/master/src/core_plugins/kibana/public/home/components/tutorial/content.js#L8)
