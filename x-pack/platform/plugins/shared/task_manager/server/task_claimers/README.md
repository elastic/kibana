task_claimers
========================================================================

This directory contains code that claims the next tasks to run.

The code is structured to support multiple strategies, but currently
only supports a `default` strategy.


`default` task claiming strategy
------------------------------------------------------------------------
This has been the strategy for task manager for ... ever?  The basic 
idea:

- Run an update by query, for number of available workers, to "mark"
  task documents as claimed, by setting task state to `claiming`.  
  We can do some limited per-task logic in that update script.  

- A search is then run on the documents updated from the update by
  query.

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
