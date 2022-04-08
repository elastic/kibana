# esmev - Elasticsearch Mappings for Everything

_part of [on-week 2022@1 - Patrick Mueller](./README.md)_

Typing needs are everywhere!  In Kibana we have:

- lots of TypeScript typing in our `.ts[x]` files
- elasticsearch index mappings
- http endpoints
- Kibana config data
- documentation
- ???

I'm mostly interested in providing a better story around the last
entries, than we have today, especially as in relation to TypeScript typing:
I'd like to have elasticsearch index mappings and http endpoints "schema"
that can be used to validate and type data structures native to Typescript.
Typescript typing is already something we do by hand in `.ts` files.  Everything
else in this list deals with data that we're receiving or sending outside of 
the Kibana codebase.

Currently within Kibana alerting we mostly use `@kbn/config-schema` to
define types for cases where there is incoming data of unknown shape
(for instance, from an HTTP route POST body), and what's nice is that
this generates a TypeScript type as well, dynamically, so that we
get nice typing on the output of the `validate()` method.

There are issues though.  It's meant to be an `unknown` -> "typed" kind of
conversion.  It's actually kind of hard to make the generated types
writable, so that you can use them to **generate** data from these
types instead of just reading it.  The types as previewed by vscode
can also get a bit overwhelming, especially if operators are applied
to make the properties writeable and not just read-only.

And elasticsearch mappings aren't going anywhere soon.  So it seems
like it would be interesting to try to create some tooling around treating the
current elasticsearch mappings format as the source of truth for
generating the following data structure artifacts:

- documentation of the data structure, fields/types, etc
- validators that take `unknown` typed data and confirm it matches the
  mappings
- TypeScript types for the data structures, a nicer "view" than provided
  by config schema

There isn't really much for auto-generated elasticsearch mappings that 
I'm aware of, outside of 
[the quick hack generator I wrote for the event_log plugin](https://github.com/elastic/kibana/blob/main/x-pack/plugins/event_log/generated/README.md), but I'm sure there's
a wide body of existing work in this area out there. I choose to be blind
to it for the moment :-). For the event log, 
there was also some follow-on work by the RAC team for the
alerts-as-data indices, but since I'm trying to go greenfield here, I'll
ignore that for the moment also.

Going to try this in Deno as well.  See how well top-level Deno CLI
scripts live and breathe in the Kibana directory structure.  Can I 
import existing TypeScript modules???

## Deno info

To [install Deno](https://deno.land/#installation), I went the Homebrew
option.  Then installed the Deno extension for VS Code (from denoland),
and added the following lines to my `.vscode/settings.json` file:

    "deno.enable": true,
    "deno.lint": true,
    "deno.unstable": true,
    "deno.enablePaths": ["x-pack/examples/ow22_pmuellr/scripts"]

The dev env isn't really much different than with standard nodejs.
Using these options with the Deno extension means things like the
`Deno` variable becomes known, vs if you don't have things set up
it would like a rando global variable.

Debugging _currently_ requires manual connection in vscode - I could only get it to
work via "attach" and launching with a CLI using the `--inspect-brk`
option.  **Painful**, compared to the ease of debugging nodejs.  "It
gets better", I'm sure.  Deno has so many similarities to nodejs wrt:
the debugging interface, I'm sure this will get ironed out long-term.

There were some other glitchy bits; for example, renamed files continue
to show previous errors after fixed and renamed, and similar edge
case issues.

If you told me we were switching to Deno next week, I'd be happy.  The
tooling is getting there, and in some areas better than node, and it's
just "a better node than node", just like *cough cough* C# is "a better
Java than Java".

## Inputs and Outputs

So I've already settled on Elasticsearch index mappings as the input
format.  What else?  For outputs, I'd like to generate:

- markdown files documenting the structures
- Typescript files containing interface definitions of the structures
- Typescript files containing config-schema definitions of the 
  structure

You might ask why having both a config_schema definition AND a
Typescript definition is useful.  Because config schema as provides 
Typescript types. But I already mentioned the fact that the
types from config schema can get ugly, and also see
[Axel Rauschmayer's take on this](https://2ality.com/2020/06/validating-data-typescript.html#example%3A-validating-data-via-the-library-zod).
We can extend on this a bit more, by providing Javadoc comments in the
generated source, which will show up as "hints" in vscode.  Also, when
using "Go to Type Definition" in vscode, it will take you to these
types, versus landing the bowels of config schema implementation. Wins
all around.

I make use of the neat trick mentioned in Axel's blog post, 
in the config schema output, by providing a
validation function which takes an `unknown` as input, validates
the data with the config schema, but the function signature is the
Typescript generated type, which is an easier read and likelier easier
downstream value for VSCode reflection.  Also validates that the config
schema and generate Typescript definitions are _in some ways_ compatible.
Works!  No longer bound to the read-only-ness of config schema! 

These Typescript definitions also seem like they could be
the best form of documenting these structures.  Pretty easy to read!
Here's 
[the generated documentation for the `alert` Saved Object](https://github.com/pmuellr/kibana/blob/onweek/2022/x-pack/examples/ow22_pmuellr/mappings/alerting_saved_objects_doc.md).

It's also the case that the Typescript mappings for Elasticsearch
mappings are going to be kinda weird.  In ES, any field can have
a value, or be `null`, or you could not pass it at all and not 
get it back from a query (`undefined`).  Which means all fields
need a definition in Typescript like this:

```typescript
someField?: number | null
```

I've already had to suffer with typing like this with the event log,
and it can get not pretty.  But ... you really need to provide this
level of typing for Elasticsearch fields!

OTOH, if we want to define a "structure" for HTTP usage (for example), we shouldn't
have to be so general.  We should have `optional` and `nullable` options
for fields instead.

Thinking about meta-data like this, there are some other obvious
candidates:

- being able to indicate if an Elasticsearch field is always an
  array as opposed to a single value
- adding a "description" to a field

So, we need a general way of augmenting an Elasticsearch mapping, in
such a way that the augmentation still allows us to use the mapping
with Elasticsearch.

The method I settled on is to allow properties to be added to an
Elasticsearch mapping, that are prefixed with `$`.  For example,
`$description` and `$is_array`.  These are purely additive, so
are easy to "remove" from an augmented mapping definition, by
simply removing all properties that start with `$`.  I have literally
never used 
[the `replacer` parameter](https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Global_Objects/JSON/stringify#the_replacer_parameter)
in `JSON.stringify()` till now, and it's glorious!

The final set of augmented properties for this effort is:

- `$usage` - one of `mappings` if the type is for ES mappings, otherwise `general` (eg, HTTP)
- `$is_array` - indicates the value is an array, else it's a single value (not implemented)
- `$description` - ts-doc for this property
- `$optional` - this property is optional

`$usage` should be added as a top-level property of the type

## run the tool

input and output files here: 

https://github.com/pmuellr/kibana/tree/onweek/2022/x-pack/examples/ow22_pmuellr/mappings

The input file `alerting_saved_objects.yaml` is literally a YAML file
I generated by taking 
[the existing saved object mapping for `alert`](
https://github.com/pmuellr/kibana/blob/onweek/2022/x-pack/plugins/alerting/server/saved_objects/mappings.json)
and pasting it into an online JSON-to-YAML generator.  So now I'm taking that 
as the input, and seeing if the generated mappings from it are the same
as the hand-built version.  Yes they are! 

The tool also accepts `.json` and `.toml` files as input.

```
$ cd x-pack/examples/ow22_pmuellr

$ scripts/esmev.ts mappings/alerting_saved_objects.yaml
esmev.ts: processing: mappings/alerting_saved_objects.yaml
esmev.ts: generating: mappings/alerting_saved_objects_mappings.json
esmev.ts: generating: mappings/alerting_saved_objects_schema.ts
esmev.ts: generating: mappings/alerting_saved_objects_types.ts
esmev.ts: generating: mappings/alerting_saved_objects_doc.md

$ diff mappings/alerting_saved_objects_mappings.json ../../plugins/alerting/server/saved_objects/mappings.json

$ echo nothing, beautiful
```

## usage in webhook rule

The webhook rule was written before esmev, so I thought it would be
fun to retro-fit it's HTTP interfaces, used both in the rule implementation
and the example webhook route, to use code generated from this tool.

Those files are here, named `route_schema*`:

https://github.com/pmuellr/kibana/tree/onweek/2022/x-pack/examples/ow22_pmuellr/server/routes

You can see the types in use in the route itself:

https://github.com/pmuellr/kibana/tree/onweek/2022/x-pack/examples/ow22_pmuellr/server/routes/POST_webhook_rule_example.ts

And the types are used in the rule implementation as well:

https://github.com/pmuellr/kibana/tree/onweek/2022/x-pack/examples/ow22_pmuellr/server/rule_types/webhook_rule.ts

## relevant code

the typescript / deno code for the generators:

https://github.com/pmuellr/kibana/tree/onweek/2022/x-pack/examples/ow22_pmuellr/scripts/gen

## current state

The tool currently generates output consistent with Kibana scripture.
It has copyright notices and can pass lint tests after running
`node scripts/eslint --fix` on the files. :-)

There's a bit of a "directory output" problem.  We want config schema
for the server, but AFAIK it's not available on the client, which means
the tool would need to generate files in both `common` and `server` if
the intention that it at least some of it can be used in both the server
and browser. Given Kibana norms, this seems like a fairly straight-forward
problem to be solved later.

The codegen was getting pretty yucky for some of this stuff, 
I'm sure there are plenty of other sharp edges!  But I was pretty
impressed with how far I was able to get with just some `$`-prefixed
properties in an Elasticsearch mapping file!

I'm not sure what to do about dates.  Ideally the Typescript interfaces
would deal with `Date` objects directly, but not sure if this is
possible with config schema.  We may need some sort of translation
layer done in the `validate{Type}` methods which call the config
schema validator but return the Typescript generated type.  There
are likely other object typing issues like this.

When retrofitting the webhook rule's HTTP structures to use esmev,
I realized I didn't know how to map objects with arbitrary keys,
which was used in the original design to send the instance data
back.  I hate that pattern anyway :-).  So converted it into an
array, which meant I had to add support for `nested` types as well
(arrays are typed as `nested`).  All worked fine, and now no arbitrary
keyed objects!

The generated documentation is quite sub-par, and to add insult to
injury, Github is not showing the fenced code blocks with either `ts`
or `typescript` language tags, even though I've seen in other places
in Github!.  I must be holding it wrong.  On the plus side, there's
almost no code in this generator because it just uses the typescript
type generator to generate it's content.  A bit more work would have
yielded something a little nicer.