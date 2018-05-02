## I18n engine

[React-intl](https://github.com/yahoo/react-intl) is built around
[intl-messageformat](https://github.com/yahoo/intl-messageformat),
so both react and angular frameworks will use the same engine and
the same message syntax. The engine uses the ICU Message syntax
and works for all CLDR languages which have pluralization rules
defined. `intl-messageformat` package exposes `IntlMessageFormat`
constructor. Messages are provided into the constructor as a
string message, or a pre-parsed AST object.

```
import IntlMessageFormat from 'intl-messageformat';

const msg = new IntlMessageFormat(message, locales, [formats]);
```

The string `message` is parsed, then stored internally in a
compiled form that is optimized for the `format()` method to
produce the formatted string for displaying to the user.

```
const output = msg.format(values);
```

Creating instances of `IntlMessageFormat` is an expensive operation.
[Intl-format-cache](https://github.com/yahoo/intl-format-cache)
library is simply to make it easier to create a cache of format
instances of a particular type to aid in their reuse. Under the
hood, this package creates a cache key based on the arguments passed
to the memoized constructor.

```
import memoizeIntlConstructor from 'intl-format-cache';

const getMessageFormat = memoizeIntlConstructor(IntlMessageFormat);
```

`Intl-messageformat` package assumes that the
[Intl](https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Global_Objects/Intl)
global object exists in the runtime. `Intl` is present in all modern
browsers and Node.js > 0.10. In order to load `Intl MessageFormat`
in Node.js we should simply `require()` this package (in Node.js,
the data for all 200+ languages is loaded along with the library):
```
const IntlMessageFormat = require('intl-messageformat');
```

After that we are able to use this library in the same way as for browsers.

## Angular wrapper

Angular wrapper will have at least 3 entities: translation `service`,
`directive` and `filter`. Both, the directive and the filter will use
the translation service with `intl-messageformat` library under the hood.

The translation `service` will provide the following methods (names can be changed):
- `addMessages(messages: object, [locale: string])` - provides a way to register
translations with the library
- `getMessages()` - returns messages for the current language
- `locale(locale: string)` - tells the library which language to use by given
language key
- `locale()` - returns the current locale 
- `defaultLocale(locale: string)` - tells the library which language to fallback
when missing translations
- `defaultLocale()` - returns the default locale
- `defineFormats(formats: object)` - supply a set of options to the underlying formatter
- `translate({id: string, values: object, defaultMessage: string})` – translate message by id

The translation `filter` will look like this:
```
{{'translationId' | i18n[:{ values: object, defaultMessage: string }]}}
```

Where:
- `translationId` - translation id to be translated
- `values` - values to pass into translation
- `defaultMessage` - will be used unless translation was successful

The translation `directive` will look like this:
```
<ANY
  i18n="{string}"
  [i18n-values="{object}"]
  [i18n-default-message="{string}"]
></ANY>
```

Where:
- `i18n` - translation id to be translated
- `i18n-values` - values to pass into translation
- `i18n-default-message` - will be used unless translation was successful

## Localization files

Localization files will have [JSON5](https://github.com/json5/json5) format,
so single and multi-line comments are allowed. It can help to understand
which section of application localization key is used for. Also `namespaces`
will be used in order to simplify message location search. For example, if
we are going to translate the title of `/management/sections/objects/_objects.html`
file, we should use message path like this: `'MANAGEMENT.OBJECTS.TITLE'`.

Each Kibana plugin will have a separate folder with translation files located at
```
src/core_plugins/{plugin_name}/translations/{locale}.json
```

where `locale` is [ISO 639 language code](https://en.wikipedia.org/wiki/List_of_ISO_639-1_codes).

For example:
```
src/core_plugins/kibana/translations/en.json
```

When a new translation file is added, you have to register this file into
`uiExports.translations` array of plugin constructor parameters. For example:
```
export default function (kibana) {
  return new kibana.Plugin({
    uiExports: {
      translations: [
        resolve(__dirname, './translations/en.json'),
      ],
      ...
    },
    ...
  });
}
```

Localization files are loaded in `src/ui/public/chrome/api/angular.js` file and
provided to angular using `i18nProvider`:
```
uiModules.get('kibana').config(function (i18nProvider) {
  i18nProvider.addMessages(chrome.getTranslations());
});
```

After that we are able to provide translation messages to react `IntlProvider`:
```
const i18n = $injector.get('i18n');
const locale = i18n.locale();
const messages = i18n.getMessages();

<IntlProvider
  locale={locale}
  messages={messages}
>
  ...
</IntlProvider>
```

## Build tools

In order to simplify localization process, some build tools will be added:
- tool for verifying all translations have translatable strings
- tool for checking unused translation strings
- tool for extracting default messages from templates

While `react-intl` has
[babel-plugin-react-intl](https://github.com/yahoo/babel-plugin-react-intl)
library which extracts string messages for translation, angular wrapper requires
own implementation of such tool. In order to extracrt translation keys from the
template, we have to parse it and create AST object. There is a
[babel-plugin-syntax-jsx](https://github.com/babel/babel/tree/master/packages/babel-plugin-syntax-jsx)
plugin which helps to parse JSX syntax and then create AST object. Unfortunately,
there are no babel plugins to parse angular templates. One of the solution can be internal
[`$parse.$$getAst`](https://github.com/angular/angular.js/blob/master/src/ng/parse.js#L1819)
angular method.
