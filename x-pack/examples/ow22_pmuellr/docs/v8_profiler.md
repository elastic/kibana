# V8 Profiler

_part of [on-week 2022 - Patrick Mueller](./README.md)_

HTTP endpoints in Kibana to run a CPU profile for specified duration, and
obtain a heap snapshot. 

_Note: at the time of this writing, there appears to be something broken with
the heap snapshots.  They often finish, on the server side._

The endpoints are:

    /_dev/cpu_profile?duration=(seconds)&interval=(microseconds)
    /_dev/heap_snapshot

Try them right now!

- [`/_dev/cpu_profile?duration=15&interval=100`](/_dev/cpu_profile?duration=15&interval=100)
- [`/_dev/heap_snapshot`](/_dev/heap_snapshot)

When using curl, you can use the `-OJ` options, which:

- `-O` `--remote-name`: use the server-specified name for this download
- `-J` `--remote-header-name`: use the `Content-Disposition` as the name of
  the download

The files generated will be:

    MM-DD_hh-mm-ss.cpuprofile
    MM-DD_hh-mm-ss.heapsnapshot

These filetypes are the ones expected by various V8 tools that can read these.

You can use these URLs in your browser, and the files will be saved with the
generated names.

### profile / heap snapshot readers

The traditional tools used to view these are part of Chrome Dev Tools (CDT).  

For CPU profiles, open Chrome Dev Tools and then click on the "Performance" menu.
You should be able to drop a file right from Finder / Explorer onto the CDT window,
and then get the visualization of the profile.  If you downloaded the profile right
from the browser, using the URL in the URL bar, you can drop the download file from
the download status button right into CDT.

For heap snapshots, open the "Memory" tool instead, and note that it does not
appear to support drag and drop from a file.  You'll need to right click on
"Profiles" in the left-top pane, to see the "Load..." menu, which will allow
you to select a file via a file prompted.

For heap snapshots, CDT is the only tool I know of that can read these, and
it's not an easy to understand tool.  :-)

For CPU profiles, there are other options.

VSCode now supports `.cpuprofile` files directly, displaying them as a table of
function timings.  There is also an extension available to display flame charts,
installed by clicking on the grey-ed out "flame" button on the top-right of the
cpu profile view. _Note: after playing around with this for quite some time -
it's nice, but there are UI bugs, and some of the numbers aren't quite right.
Compared to the other profiler readers mentioned here, which showed the same
numbers for top entries._

An alternate view of CPU profiles, which organizes files based on "packages",
is available at https://pmuellr.github.io/no-pro/ .  It also supports
drag-n-drop of CPU profile files.  Note that you can get more directories to
show up as "packages", by bringing up CDT and running the following code:

    localStorage['fake-packages-dirs'] = "x-pack/plugins,packages,src/core"
