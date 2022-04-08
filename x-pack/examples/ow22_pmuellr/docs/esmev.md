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
- TypeScript types for the data structures, perhaps one read-only
  (to match `@kbn/config-schema`) and one writable?

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

I make use of this neat trick in the config schema output, by providing a
validation function which takes an `unknown` as input, validates
the data with the config schema, but the function signature is the
Typescript generated type, which is an easier read and likelier easier
downstream value for VSCode reflection.  Also validates that the config
schema and generate Typescript definitions are _in some ways_ compatible.
Works!  No longer bound to the read-only-ness of config schema! Also,
the "documentation" for these interfaces seems best to be "simple" 
Typescript, if you'll let me toss my 2ct in.  What's better?  What would
a customer find better? It's not
great by any strech, but I think it seems like a good base that could be
extended upon: here's 
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
have to be so general.  We should have `required` and `nullable` options
for fields instead.

Thinking about meta-data like this, there are some other obvious
candidates:

- being able to indicate if an Elasticsearch field is always single
  value instead of an array - actually the opposite is more useful;
  most usages of fields within Kibana internals are single-value,
  not multi-value
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

# run the tool

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

## relevant code

the `.yaml` files are the mapping source, all the other files are generated:

https://github.com/pmuellr/kibana/tree/onweek/2022/x-pack/examples/ow22_pmuellr/mappings

the typescript / deno code for the generators:

https://github.com/pmuellr/kibana/tree/onweek/2022/x-pack/examples/ow22_pmuellr/scripts/gen

## current state

The tool currently generates output consistent with Kibana scripture.
It has copyright notices and passes lint checks!  I'm sure there
are plenty of edge cases on the lint checks :-)

Only handing "mapping" structures.  For HTTP structures, we'll want
some additional augmentation properties like `$optional` and `$nullable` to be
specified on a per-field basis.  These just change the config schema
generated, and Typescript types generated, a bit.  

But the bigger picture is that you want to view a mappings input file
as being for Elasticsearch index mappings, or some other general purpose.
For Elasticsearch, every field is optional and null-able.  More generally,
you'll want to be more specific about fields that can be `null` or not
passed at all (`undefined`). This bit is currently not implemented, but
seems straight-forward.

I've settled this now via a `$usage` augmentation property, used at the top-level,
which indicates which flavor you'd like: `mappings` or `general`.  With
`mappings`, you get Elasticsearch appropriate optionality/nullability,
but with `general`, you would solve it with `$optional` and `$nullable`
augmentation properties.  

Didn't get around to that `general` bit though.

There's also a bit of a "directory output" problem.  We want config schema
for the server, but AFAIK it's not available on the client, which means
the tool would need to generate files in both `common` and `server` if
the intention that it at least some of it can be used in both the server
and browser. Given Kibana norms, this seems like a fairly straight-forward
problem to be solved later.

I'm sure there are plenty of other sharp edges!  But I was pretty
impressed with how far I was able to get with just some `$`-prefixed
properties in an Elasticsearch mapping file!
