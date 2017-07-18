# Kibana UI Framework Generator

You can use this generator to easily add components to the Kibana UI Framework.

## Getting started

#### Install Yeoman

```bash
npm install -g yo
```

## Add a UI component

From the command line, run `npm run kui`.

### What do you want to create?

First, you'll be prompted for what kind of file to create:

| | Choice | Files created |
|---|---|---|
| [x] | Stateless function | {Name}.jsx, {Name}.spec.jsx, {_name}.scss |
| [x] | Component class | {Name}.jsx, {Name}.spec.jsx, {_name}.scss |
| [x] | Service | .js, .spec.js |
| [x] | View (and container) | {Name}View.jsx, {Name}Container.js, {Name}Container.spec.js |
| [ ] | Reducer | .js, .spec.js |
| [ ] | Action | .js, .spec.js |
| [X] | New app | Skeleton |

## Adding a file to your app

If you choose any option other than "New app", you'll enter a series of prompts to
help you add a file to your app.

### What's the name of the file?

Now Yeoman will ask you what to name the file. It expects you to provide the name
in camel case. Yeoman will automatically add file extensions so leave that out.

In the case of a View file, Yeoman will strip the words "view" and "container",
and append those words to the generated files (see above).

### Where should it go?

This defaults to the last directory you specified for this prompt. To change this location,
type in the path to the directory where the files should live, relative to the repo's root directory. For example, `ui_framework/src/components` will create a new UI Framework component in the correct location.

You can also use this prompt to create components anywhere, for example in Kibana's `src` directory.

If you want Yeoman to automatically generate a directory to organize the files,
that directory will be created inside of the location you specify (see next prompt).

### Does it need its own directory?

This defaults to `YES`. This will automatically generate a directory with the
same name as the file.

### Done!

Yeoman will generate the files you need in your project's folder system.

For your convenience, it will also output some snippets you can tweak to import
and re-export the generated JS, JSX, and SCSS files.

## Creating a new app

If you choose the "New app" option from the initial prompt, you'll be asked
for the name of your app. This will generate a folder of the same name, and
fill it with the basic files to form the skeleton of the app. Yeoman will take
guess that you will name your app's repo with a snake-cased version of the name
you specified, and configure the package.json file accordingly.

`cd` into your new app's directory and run `npm i` to install the dependencies.
Once they're installed, you can run `gulp` to start developing locally.
