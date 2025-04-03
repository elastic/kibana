# Task Manager Dependencies

This plugin is used as a temporary sidecar plugin to enable the task manager plugin access to 
the encrypted saved objects client as there is a circular dependency if the task manager were to
require the encrypted saved objects plugin directly.

This is because the encrypted saved objects plugin has a dependency on the security plugin, which
has a dependency on the task manager plugin. In the future we can remove this plugin when we 
extract the task manager related code from the security plugin into another plugin.