# esmev - Elasticsearch Mappings for Everything

_part of [on-week 2022 - Patrick Mueller](./README.md)_

Typing is everywhere!  In Kibana we have:

- lots of TypeScript typing in our `.ts[x]` files
- elasticsearch index mappings
- http endpoints
- Kibana config data
- ???

I'm mostly interested in providing a better story around the second
two than we have today, especially as it relatess to TypeScript typing:
elasticsearch index mappings and http endpoints.

Currently within Kibana alerting we mostly use `@kbn/config-schema` to
define types for cases where there is incoming data of unknown shape
(for instance, from an HTTP route POST body), and what's nice is that
this generates a TypeScript type as well, dynamically, so that we
get nice typing on the output of the `validate()` method.

There are issues though.  It's mean to be an `any` -> "typed" kind of
coversion.  It's actually kind of hard to make the generated types
writable, so that you can use them to **generate** data from these
types instead of just reading it.

There isn't really much for elasticsearch mappings that I'm aware of,
outside of 
[the quick hack generator I wrote for the event_log plugin](https://github.com/elastic/kibana/blob/main/x-pack/plugins/event_log/generated/README.md) - there was some follow-on work by the RAC team for the
alerts-as-data indices, but since I'm trying to go greenfield, I'll
ignore that for the moment.

And elasticsearch mappings aren't going anywhere soon.  My current feels
are that we should try to create some tooling around treating the
current elasticsearch mappings format as the source of truth for
generating the following data structure artifacts:

- documentation of the data structure, fields/types, etc
- validators that take `unknown` typed data and confirm it matches the
  mappings
- TypeScript types for the data structures, perhaps one read-only (
  (to match `@kbn/config-schema`) and one writable?

Going to try this in Deno as well.  See how well top-level Deno CLI
scripts live and breathe in the Kibana directory structure.  Can I 
import existing TypeScript modules???

To [install Deno](https://deno.land/#installation), I went the Homebrew
option.  Then installed the Deno extension for VS Code (from denoland),
and added the following lines to my `.vscode/settings.json` file:

    "deno.enable": true,
    "deno.lint": true,
    "deno.unstable": true,
    "deno.enablePaths": ["x-pack/examples/ow22_pmuellr/scripts"]





Why having both config_schema AND ts types is good:

https://2ality.com/2020/06/validating-data-typescript.html#example%3A-validating-data-via-the-library-zod