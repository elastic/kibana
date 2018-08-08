# Building on Linux
The following script will run in the elastic/ubuntu-16.04-x86_64 virtual machine. It should be noted that the harddisk of the Virtual Machine should be resized to at least 40GB.

# Building on Windows
Some dependencies must be installed on the build machine to build on Windows, those are specified [here](https://chromium.googlesource.com/chromium/src/+/master/docs/windows_build_instructions.md). You don't have to install the depot_tools, just Visual Studio and the Windows SDK. When building on Windows, using the `--workspace` flag is likely required because of the NTFS max paths.

# Building on macOS
XCode and the OS X 10.10 SDK are currently required, but the full requirements are specified [here](https://chromium.googlesource.com/chromium/src/+/master/docs/mac_build_instructions.md). Also, you don't have to install the depot_tools.


## Updating the revision
If you want to build the headless_shell that mirrors a specific version of the Chrome browser, you can take the version number displayed in `Chrome -> About` and plug it into the "Version" input [here](https://omahaproxy.appspot.com/) and it'll give you the Commit that you can feed into the build script using the `--git-sha` argument. It's highly recommended to update the default when you're upgrading the version.
