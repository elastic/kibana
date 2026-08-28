task_claimers
========================================================================

This directory contains code that claims the next tasks to run.

The code is structured to support multiple strategies, but currently
only supports one.
The current `default` is the `mget` claiming strategy. 
The `update_by_query` strategy has been removed as of [#271452](https://github.com/elastic/kibana/issues/271452)

`mget` task claiming strategy
------------------------------------------------------------------------

see: https://github.com/elastic/kibana/issues/155770

The idea is to get more tasks than we have workers for with a search,
and then validate that they are still valid (not been claimed) with an
mget, since they may be stale.

There are lots of interesting potential things we can do here, like maybe
skipping polling completely for a round (think single Kibana, and the earlier
poll got 2 * workers tasks out).  But we'll probably start with the bare
minimum to get it working.
